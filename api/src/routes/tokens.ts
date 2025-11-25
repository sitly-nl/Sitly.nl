import { UserInfoInterface } from './users/users-create';
import { AppleAuth } from './../services/apple-auth.service';
import { LogService } from './../services/log.service';
import { optionalAwait, Util } from '../utils/util';
import { SitlyRouter } from './sitly-router';
import { Request, Response } from 'express';
import { BaseRoute } from './route';
import { Error as JSONAPIError } from 'jsonapi-serializer';
import { SitlyToken, SitlyTokenType, SitlyUserTokenData } from './../sitly-token';
import { DeviceService } from '../services/device.service';
import { BrandCode } from '../models/brand-code';
import { GoogleServices } from '../services/google.service';
import { AuthService } from '../services/auth.service';
import { TokenExpiredError } from 'jsonwebtoken';
import { forbiddenError, multipleCountrySignIn, unauthorized } from '../services/errors';
import { UserResponse, UserAttributesContext } from '../models/serialize/user-response';
import { serialize, TokenResponse } from './tokens.serializer';
import { FacebookProfile, FacebookService } from '../services/facebook.service';
import { CustomUser, CustomUserRelations } from '../models/user/custom-user.model';
import { getMainModels, getModels } from '../sequelize-connections';
import { serializeCountry } from '../models/serialize/country-response';
import { User } from '../models/user/user.model';
import { LinksService } from '../services/links.service';
import { CryptoUtil } from '../utils/crypto-util';
import { Environment } from '../services/env-settings.service';
import { StringUtil } from '../utils/string-util';

export class TokensRoute extends BaseRoute {
    private possibleIncludes: (`user.${keyof CustomUserRelations}` | 'user')[] = [
        'user.place',
        'user.subscription',
        'user.children',
        'user.references',
        'user.photos',
    ];
    static create(router: SitlyRouter) {
        router.get('/tokens/countries', async (req: Request, res: Response) => {
            return new TokensRoute().countriesForEmail(req, res);
        });

        router.post('/tokens', async (req: Request, res: Response) => {
            if (req.body.device !== undefined) {
                const validated = await new TokensRoute().validateDevice(req, res);
                if (!validated) {
                    return void 0;
                }
            }
            if (req.body.tempToken !== undefined) {
                return new TokensRoute().createFromTempToken(req, res);
            } else if (req.body.facebookAccessToken && !req.body.email) {
                return new TokensRoute().createFromFacebookToken(req, res);
            } else if (req.body.appleToken || req.body.appleCode) {
                return new TokensRoute().createFromAppleTokenCode(req, res);
            } else if (req.body.userId && req.body.tokenCode && !req.body.email) {
                return new TokensRoute().createFromTokenCode(req, res);
            } else if (req.body.googleAuthToken) {
                return new TokensRoute().createFromGoogleToken(req, res);
            } else {
                return new TokensRoute().createToken(req, res);
            }
        });
    }

    async countriesForEmail(req: Request, res: Response) {
        req.checkQuery('email')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'email is required',
            })
            .isEmail()
            .withMessage({
                code: 'INVALID_FORMAT',
                title: 'Invalid email address',
            });
        if (await this.handleValidationResult(req, res)) {
            return;
        }

        const countries = await getMainModels().UserCountry.byEmail(req.query.email as string);
        res.json(await serializeCountry(countries, req.localeId));
    }

    async validateDevice(req: Request, res: Response) {
        const deviceService = new DeviceService(req.brandCode);

        deviceService.sanitize(req, 'device');

        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }
        return true;
    }

    private async createFromFacebookToken(req: Request, res: Response) {
        req.sanitizeBody('facebookAccessToken').trim();

        try {
            const facebookService = new FacebookService(req.body.facebookAccessToken as string);
            let fbResponse: FacebookProfile;
            try {
                const start = new Date();
                fbResponse = await facebookService.getMe('email');
                LogService.logRequest({
                    req,
                    label: 'user.signIn.facebookToken.facebookRequest.timing',
                    details: { time: new Date().getTime() - start.getTime() },
                    user: undefined,
                });
            } catch {
                LogService.logRequest({
                    req,
                    label: 'user.signIn.facebookToken.error.facebook.invalidAccessToken',
                    message: `platform=${req.get('User-Agent')}`,
                    user: undefined,
                });
                return unauthorized({ res, title: 'Invalid facebook access token', code: 'INVALID_TOKEN' });
            }

            let countryCode;
            if (req.brandCode === BrandCode.main) {
                const userCountry = await getMainModels().UserCountry.byEmailOrFacebookId(fbResponse.email ?? '', fbResponse.id);
                if (!userCountry) {
                    return this.parseAuthResult(req, res);
                }
                countryCode = userCountry.country_code;
            } else {
                countryCode = req.brandCode;
            }

            const user = await getModels(countryCode).User.byEmailOrFacebookId(fbResponse.email, fbResponse.id);
            if (!user) {
                return this.parseAuthResult(req, res);
            }

            const result = {
                user,
                countryCode,
                type: 'facebookToken',
            };
            this.parseAuthResult(req, res, result);
        } catch (error) {
            this.serverError(req, res, error as Error);
            LogService.logRequest({ req, label: 'user.signIn.error.server', user: undefined });
        }
    }

    async createFromAppleTokenCode(req: Request, res: Response) {
        let tokenObject:
            | {
                  email: string;
                  sub: string;
              }
            | undefined;
        if (req.body.appleCode) {
            try {
                const token = await AppleAuth.validateCode(req.body.appleCode as string, Util.isIOSApp(req.headers));
                if (token) {
                    tokenObject = SitlyToken.parseJwt(token);
                }
            } catch {}

            if (!tokenObject) {
                res.status(422);
                res.json(
                    JSONAPIError({
                        code: 'INVALID_VALUE',
                        title: 'Validation of code failed',
                        source: { parameter: 'appleCode' },
                    }),
                );
                return;
            }
        } else {
            tokenObject = SitlyToken.parseJwt(req.body.appleToken as string);
        }

        const email = tokenObject?.email as string;
        const token = tokenObject?.sub;
        if (!email || !token) {
            res.status(422);
            res.json(
                JSONAPIError({
                    code: 'INVALID_VALUE',
                    title: "Token doesn't contain all necessary data",
                    source: { parameter: 'appleToken' },
                }),
            );
            return;
        }

        const countryCode = req.brandCode === BrandCode.main ? await this.handleMainLogin(email, res) : req.brandCode;
        if (!countryCode) {
            return;
        }

        const user = await getModels(countryCode).User.byEmail(email);
        if (!user) {
            return this.parseAuthResult(req, res);
        }

        if (req.body.appleCode) {
            // just return user (and merge if necessary)
            if (!user.customUser.apple_token) {
                await user.customUser.update({ apple_token: token });
            }
        } else {
            const existingToken = user.customUser.apple_token;
            if (existingToken) {
                if (existingToken !== token) {
                    return this.parseAuthResult(req, res);
                }
            } else {
                res.status(422).json(
                    JSONAPIError({
                        code: 'DUPLICATE_EMAIL',
                        title: 'This e-mail already exists',
                        source: { parameter: 'appleToken' },
                    }),
                );
                return;
            }
        }

        this.parseAuthResult(req, res, {
            user,
            type: 'appleToken',
        });
    }

    async createFromGoogleToken(req: Request, res: Response) {
        let googleAccount: UserInfoInterface;
        try {
            googleAccount = await GoogleServices.getAccountFromAuthToken(req.body.googleAuthToken as string, req.headers);
        } catch {
            return this.parseAuthResult(req, res);
        }

        const email = googleAccount?.email;
        if (!email) {
            res.status(422);
            return res.json(
                JSONAPIError({
                    code: 'INVALID_VALUE',
                    title: "Token doesn't contain all necessary data",
                    source: { parameter: 'googleAuthToken' },
                }),
            );
        }

        const countryCode = req.brandCode === BrandCode.main ? await this.handleMainLogin(email, res) : req.brandCode;
        if (!countryCode) {
            return;
        }

        const user = await getModels(countryCode).User.byEmail(email);
        if (!user) {
            return this.parseAuthResult(req, res);
        }

        this.parseAuthResult(req, res, {
            user,
            type: 'googleToken',
        });
    }

    async createFromTempToken(req: Request, res: Response) {
        req.sanitizeBody('tempToken').trim();

        req.checkBody('tempToken').notEmpty().withMessage({
            code: 'REQUIRED',
            title: 'tempToken is required',
        });
        const validationErrors = await this.handleValidationResult(req, res);
        if (validationErrors) {
            LogService.logRequest({ req, label: 'user.signIn.tempToken.error.validation', details: validationErrors, user: undefined });
            return void 0;
        }

        try {
            const sitlyToken = new SitlyToken();

            let token;
            try {
                token = sitlyToken.verify<SitlyUserTokenData>(req.body.tempToken as string);
            } catch (e) {
                if (e instanceof TokenExpiredError) {
                    return unauthorized({ res, title: 'Token expired', code: 'TOKEN_EXPIRED' });
                }
            }

            if (!token) {
                this.parseAuthResult(req, res);
                return void 0;
            }
            const user = await AuthService.userAllowedWithJwt(req, token, SitlyTokenType.temporary);
            if (!user) {
                this.parseAuthResult(req, res);
                return void 0;
            }

            const type = 'tempToken';
            if (user.customUser?.completed === 0) {
                LogService.logRequest({ req, label: `user.signIn.${type}.error.uncompleteUser`, user });
                return forbiddenError({
                    res,
                    code: `INVALID_${type.toUpperCase()}`,
                    title: `${type}  cannot be used to login uncompleted users`,
                });
            }

            const result = {
                user,
                countryCode: req.brandCode,
                type,
            };
            this.parseAuthResult(req, res, result);
        } catch (err) {
            console.trace('err', err);
            this.serverError(req, res);
            LogService.logRequest({ req, label: 'user.signIn.error.server', user: undefined });
        }
    }

    async parseAuthResult(req: Request, res: Response, authResult?: { user: User; type: string }) {
        if (!authResult) {
            unauthorized({ res });
        } else {
            const userModel = authResult.user;

            const brandCode = authResult.user.brandCode;
            const deviceService = new DeviceService(brandCode);

            if (req.body.device) {
                await deviceService.createOrUpdate({
                    updated_at: new Date(),
                    device_type: req.body.device.deviceType as never,
                    fcm_token: req.body.device.fcmToken as string,
                    device_token: req.body.device.deviceToken as string,
                    webuser_id: userModel.webuser_id,
                });
            }

            if (!userModel.customUser.verified) {
                forbiddenError({ res, code: 'UNVERIFIED_USER', title: 'E-mail or phone-number has not been verified' });
            } else {
                try {
                    res.status(201);

                    let includes;
                    try {
                        includes = this.getIncludes(req, this.possibleIncludes);
                    } catch (e) {
                        return this.handleError(req, res, e);
                    }

                    const customUserIncludes = new Set(
                        includes
                            .filter(include => include !== 'user')
                            .map(include => include.replace('user.', '') as keyof CustomUserRelations),
                    );
                    customUserIncludes.add('place');
                    customUserIncludes.add('locale');
                    const userToReturn = await getModels(userModel.brandCode).User.findByPk(userModel.webuser_id, {
                        rejectOnEmpty: true,
                        include: {
                            association: 'customUser',
                            include: CustomUser.includes(Array.from(customUserIncludes)),
                        },
                    });

                    const reEnabled = userToReturn.customUser.disabled === 1;
                    await userToReturn.customUser.update({
                        disabled: 0,
                        session_start_time: new Date(),
                    });

                    const responseData: TokenResponse = {
                        id: 'access-token',
                        token: SitlyToken.accessToken(userToReturn),
                        countryCode: brandCode,
                    };

                    if (!userToReturn.customUser.completed) {
                        if (!userToReturn.customUser.token_code) {
                            await userToReturn.customUser.update({
                                token_code: StringUtil.randomString(8),
                            });
                        }
                    }

                    if (includes.indexOf('user') >= 0) {
                        const context: UserAttributesContext = {
                            type: 'regular.me',
                            localeCode: userToReturn.customUser.locale?.locale_code,
                            include: {
                                place: includes.includes('user.place'),
                                subscription: includes.includes('user.subscription'),
                                references: includes.includes('user.references'),
                            },
                            user: userToReturn,
                            customSetter: (user, userResponse) => {
                                if (req.cmsAuthenticated) {
                                    userResponse.internalUserId = user.webuser_id;
                                }
                            },
                        };
                        responseData.user = await UserResponse.instance(userToReturn, context);
                        responseData.completionUrl = responseData.user.completionUrl;
                    } else if (!userToReturn.customUser.completed) {
                        responseData.completionUrl = LinksService.completionUrl(userToReturn);
                    }

                    const response = serialize(responseData, reEnabled);
                    await optionalAwait(
                        LogService.logRequest({
                            req,
                            label: `user.signIn.${authResult.type}`,
                            message: `platform=${req.get('User-Agent')}, email=${userToReturn.email}`,
                            user: userToReturn,
                        }),
                    );
                    res.json(response);
                } catch (e) {
                    console.trace(e);
                    LogService.logRequest({
                        req,
                        label: 'user.signIn.error.parseAuthResult',
                        message: (e as Error).message,
                        user: undefined,
                    });
                    unauthorized({ res });
                }
            }
        }
    }

    async createToken(req: Request, res: Response) {
        req.sanitizeBody('email').trim();
        req.sanitizeBody('password').trim();

        req.checkBody('email')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'E-mail is required',
            })
            .isEmail()
            .withMessage({
                code: 'INVALID_FORMAT',
                title: 'Invalid e-mail address',
            });
        req.sanitizeBody('facebookAccessToken').trim();

        req.checkBody('password').notEmpty().withMessage({
            code: 'REQUIRED',
            title: 'Password is required',
        });

        const validationErrors = await this.handleValidationResult(req, res);
        if (validationErrors) {
            LogService.logRequest({ req, label: 'user.signIn.general.error.validation', details: validationErrors, user: undefined });
            return;
        }

        const email = req.body.email as string;
        try {
            const countryCode = req.brandCode === BrandCode.main ? await this.handleMainLogin(email, res) : req.brandCode;
            if (!countryCode) {
                return;
            }
            const models = getModels(countryCode);
            const user = await models.User.login(email, req.body.password as string);
            if (!user) {
                this.parseAuthResult(req, res);

                // For debug purpose only
                const userObject = { user_json: 'not retrieving' };
                if (req.brandCode === BrandCode.main) {
                    const userByEmail = await models.User.byEmail(email, true);
                    if (userByEmail?.customUser) {
                        userObject.user_json = 'found';
                    } else {
                        userObject.user_json = 'was not found';
                    }
                }
                LogService.logRequest({
                    req,
                    label: 'user.signIn.general.error.noSuchUser',
                    message: `email=${req.body.email};req['brandCode']=${req.brandCode};countryCode=${countryCode};len=${
                        req.body.password.length
                    };data=${CryptoUtil.encryptIv(req.body.password as string, Environment.apiKeys.jwt_secret)}`,
                    details: userObject,
                    user: undefined,
                });
                return;
            }

            if (req.body.facebookAccessToken) {
                const facebookService = new FacebookService(req.body.facebookAccessToken as string);
                const fbResponse = await facebookService.getMe('email');
                if (fbResponse) {
                    if (fbResponse.email) {
                        user.customUser.facebook_email = fbResponse.email;
                    }

                    if (fbResponse.id) {
                        user.customUser.facebook_id = fbResponse.id;
                    }
                    await user.customUser.save();
                }
            }
            const result = {
                user,
                countryCode,
                type: 'general',
            };
            this.parseAuthResult(req, res, result);
        } catch (err) {
            console.trace('err', err);
            this.serverError(req, res);
            LogService.logRequest({ req, label: 'user.signIn.error.server', user: undefined });
        }
    }

    async createFromTokenCode(req: Request, res: Response) {
        req.sanitizeBody('userId').trim();
        req.sanitizeBody('tokenCode').trim();

        req.checkBody('userId').notEmpty().withMessage({
            code: 'REQUIRED',
            title: 'userId is required',
        });

        req.checkBody('tokenCode').notEmpty().withMessage({
            code: 'REQUIRED',
            title: 'tokenCode is required',
        });

        const validationErrors = await this.handleValidationResult(req, res);
        if (validationErrors) {
            LogService.logRequest({ req, label: 'user.signIn.tokenCode.error.validation', details: validationErrors, user: undefined });
            return void 0;
        }

        try {
            const user = await getModels(req.brandCode).User.byUserUrlAndTokenCode(req.body.userId as string, req.body.tokenCode as string);
            if (!user) {
                return this.parseAuthResult(req, res);
            }

            if (user.customUser.completed === 1) {
                return forbiddenError({ res, code: 'INVALID_TOKEN_CODE', title: 'Token code cannot be used to login existing users' });
            }

            await user.customUser.update({ verified: 1 });
            const result = {
                user,
                countryCode: req.brandCode,
                type: 'tokenCode',
            };
            this.parseAuthResult(req, res, result);
        } catch (err) {
            console.trace('err', err);
            this.serverError(req, res);
            LogService.logRequest({ req, label: 'user.signIn.error.server', user: undefined });
        }
    }

    private async handleMainLogin(email: string, res: Response) {
        const userCountry = await getMainModels().UserCountry.byEmail(email);
        if ((userCountry?.length ?? 0) === 0) {
            unauthorized({ res });
            return undefined;
        } else if (userCountry.length > 1) {
            multipleCountrySignIn({ res, countryCodes: userCountry.map(item => item.country_code) });
            return undefined;
        }
        return userCountry[0].country_code;
    }
}
