import { Util, optionalAwait } from '../../utils/util';
import { AppleAuth } from './../../services/apple-auth.service';
import { GoogleServices } from '../../services/google.service';
import { FacebookService, FacebookProfile } from './../../services/facebook.service';
import { SitlyRouter } from '../sitly-router';
import { NextFunction, Request, Response } from 'express';
import { Error as JSONAPIError } from 'jsonapi-serializer';
import * as request from 'request';
import { UsersRoute } from './users';
import { serializeUser } from './user.serializer';
import { LogService } from '../../services/log.service';
import { DeviceService } from '../../services/device.service';
import { SitlyToken } from '../../sitly-token';
import { TokensRoute } from '../tokens';
import { config } from '../../../config/config';
import { MysqlError } from 'mysql';
import { duplicateEmailError, unauthorized } from '../../services/errors';
import { PhotoService } from '../../services/photo.service';
import { BaseRoute, ValidationError } from '../route';
import { RequestUtil } from '../../utils/request-util';
import { sanitizeUserCreate } from './user-create-sanitization';
import { User, WebRoleName, roleNameToRoleId } from '../../models/user/user.model';
import { getModels } from '../../sequelize-connections';
import { CustomUserColumns } from '../../models/user/custom-user.model';
import { StringUtil } from '../../utils/string-util';
import { isAfter } from 'date-fns';

export interface UserInfoInterface {
    firstName?: string;
    lastName?: string;
    password?: string;
    email: string;
    avatarUrl?: string;

    customUserProperties: Partial<CustomUserColumns>;
}

export enum UserCreationType {
    general,
    apple,
    facebookCode,
    facebookToken,
    googleCode,
    googleToken,
}

export class UsersCreateRoute extends UsersRoute {
    static create(router: SitlyRouter) {
        router.post('/users', async (req: Request, res: Response, next: NextFunction) => {
            if (req.body.device !== undefined) {
                const validated = await new UsersCreateRoute().validateDevice(req, res, next);
                if (!validated) {
                    return void 0;
                }
            }

            let type = UserCreationType.general;
            if (req.body.appleCode || req.body.appleToken) {
                type = UserCreationType.apple;
            } else if (req.body.facebookLoginCode) {
                type = UserCreationType.facebookCode;
            } else if (req.body.facebookAccessToken && req.body.firstName === undefined) {
                type = UserCreationType.facebookToken;
            } else if (req.body.googleLoginCode) {
                type = UserCreationType.googleCode;
            } else if (req.body.googleAuthToken) {
                type = UserCreationType.googleToken;
            }
            return new UsersCreateRoute().create(req, res, type);
        });
    }

    async create(req: Request, res: Response, type: UserCreationType) {
        sanitizeUserCreate(req, type);

        let user: User | undefined;
        let logType;
        switch (type) {
            case UserCreationType.general:
                user = await this.createGeneral(req, res);
                logType = 'general';
                break;
            case UserCreationType.apple:
                user = await this.createFromAppleData(req, res);
                logType = 'apple';
                break;
            case UserCreationType.facebookCode:
                user = await this.createFromFacebookCode(req, res);
                logType = 'facebook';
                break;
            case UserCreationType.facebookToken:
                user = await this.createFromFacebookToken(req, res);
                logType = 'facebook';
                break;
            case UserCreationType.googleCode:
                user = await this.createFromGoogleLoginCode(req, res);
                logType = 'google';
                break;
            case UserCreationType.googleToken:
                user = await this.createFromGoogleAuthToken(req, res);
                logType = 'google';
                break;
            default:
                return type satisfies never;
        }

        if (user) {
            const accessToken = SitlyToken.accessToken(user);
            res.status(201).json(
                await serializeUser({
                    data: user,
                    contextUser: user,
                    localeCode: req.locale,
                    metaInfo: { meta: { accessToken }, links: {} },
                }),
            );

            await optionalAwait(
                LogService.logRequest({
                    req,
                    label: `user.create.${logType}`,
                    message: `platform=${req.get('User-Agent')}, email=${user.email}`,
                    user,
                }),
            );
        }
    }

    private async createGeneral(req: Request, res: Response) {
        const validationResult = await req.getValidationResult();
        const errors = validationResult.array() as ValidationError[];

        if (req.body.email) {
            const emailError = errors.find(error => error.param === 'email');
            if (!emailError) {
                const models = getModels(req.brandCode);
                const existingUser = await models.User.byEmail(req.body.email as string);
                if (existingUser) {
                    if (req.body.attemptLogin) {
                        const userWithCorrectPassword = await models.User.login(req.body.email as string, req.body.password as string);
                        if (userWithCorrectPassword) {
                            new TokensRoute().parseAuthResult(req, res, {
                                user: userWithCorrectPassword,
                                type: 'general',
                            });
                            return undefined;
                        }
                    }

                    const error: ValidationError = {
                        msg: {
                            code: 'DUPLICATE_EMAIL',
                            title: 'This e-mail already exists',
                        },
                        param: 'email',
                        value: req.body.email,
                    };

                    const registrationPlatforms = [
                        existingUser.customUser.facebook_id ? 'facebook' : null,
                        existingUser.customUser.google_account_id ? 'google' : null,
                        existingUser.customUser.apple_token ? 'apple' : null,
                    ].filter(Boolean);

                    if (registrationPlatforms.length) {
                        error.meta = {
                            registrationPlatforms,
                        };
                    }
                    errors.push(error);
                }
            }
        }

        if (errors.length) {
            if (req.query.validate && req.query.validate === 'values') {
                let i = errors.length;
                while (i--) {
                    const error = errors[i];
                    // remove not-provided fields from errors
                    if (typeof error.value === 'undefined') {
                        errors.splice(i, 1);
                    }
                }
            }

            if (errors.length) {
                const botsError = errors.find(error => error.msg.code === 'NO_BOTS');
                if (botsError) {
                    await optionalAwait(
                        LogService.logRequest({
                            req,
                            label: `user.validationError.${botsError.msg.code}`,
                            message: JSON.stringify(botsError),
                            user: undefined,
                        }),
                    );
                }
                res.status(422);
            }
            const serializedErrors = JSONAPIError(errors.map(BaseRoute.errorMapper));
            res.json(serializedErrors);
            return undefined;
        } else if (req.query.validate) {
            res.json(JSONAPIError([]));
            return undefined;
        }

        return this.createUser(req, res, {
            firstName: req.body.firstName as string,
            lastName: req.body.lastName as string,
            email: req.body.email as string,
            password: req.body.password as string,
            customUserProperties: {},
        });
    }

    private async createFromAppleData(req: Request, res: Response) {
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
                return void 0;
            }
        } else {
            tokenObject = SitlyToken.parseJwt(req.body.appleToken as string);
        }

        const email = tokenObject?.email as string;
        const token = tokenObject?.sub;
        req.checkBody('appleToken')
            .custom((_: unknown) => {
                return email && token;
            })
            .withMessage({
                code: 'INVALID_VALUE',
                title: "Token doesn't contain all necessary data",
            });

        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }

        if (!req.body.appleCode) {
            const emailExists = await getModels(req.brandCode).User.emailExists(email);
            if (emailExists) {
                duplicateEmailError(res);
                return void 0;
            }
        }

        const userInfo = {
            firstName: req.body.firstName as string,
            lastName: req.body.lastName as string,
            email,
            customUserProperties: { apple_token: token },
        };
        return this.createUser(req, res, userInfo, !!req.body.appleCode);
    }

    private async createFromFacebookCode(req: Request, res: Response) {
        const facebookService = new FacebookService();
        req.sanitizeBody('facebookLoginCode').trim();
        req.sanitizeBody('facebookRedirectUrl').trim();

        try {
            const facebookAccessToken = await facebookService.codeToToken(
                req.body.facebookLoginCode as string,
                req.body.facebookRedirectUrl as string,
            );
            return this.createFromFacebookToken(req, res, facebookAccessToken);
        } catch (e) {
            console.log(e);
            unauthorized({ res });
            return void 0;
        }
    }

    private async createFromFacebookToken(req: Request, res: Response, facebookToken?: string) {
        let fetchExistingUser = true;
        if (!facebookToken) {
            if (await this.handleValidationResult(req, res)) {
                return void 0;
            }
            req.sanitizeBody('facebookAccessToken').trim();
            facebookToken = req.body.facebookAccessToken as string;
            fetchExistingUser = false;
        }
        const facebookService = new FacebookService(facebookToken);
        let facebookProfile: FacebookProfile;
        try {
            const start = new Date();
            facebookProfile = await facebookService.getMe();
            LogService.logRequest({
                req,
                label: 'user.create.facebook.facebookRequest.timing',
                details: { time: new Date().getTime() - start.getTime() },
                user: undefined,
            });
        } catch (error) {
            LogService.logRequest({
                req,
                label: 'user.create.facebook.error.dataRetrieving',
                message: JSON.stringify(error),
                user: undefined,
            });
            unauthorized({ res });

            return void 0;
        }

        const userInfo = {
            firstName: facebookProfile.first_name,
            lastName: facebookProfile.last_name,
            email: (req.body.email as string) ?? facebookProfile.email,
            avatarUrl: facebookProfile.avatarUrl,
            password: `FB:${facebookToken}`,
            customUserProperties: {
                facebook_id: facebookProfile.id,
                facebook_email: facebookProfile.email,
            },
        };
        return this.createUser(req, res, userInfo, fetchExistingUser);
    }

    private async createFromGoogleLoginCode(req: Request, res: Response) {
        let googleAccount;
        try {
            googleAccount = await GoogleServices.getAccountFromCode(
                req.body.googleLoginCode as string,
                req.body.googleRedirectUrl as string,
            );
        } catch (e) {
            console.log(e);
            unauthorized({ res });
            return void 0;
        }
        return this.createUser(req, res, googleAccount, true);
    }

    private async createFromGoogleAuthToken(req: Request, res: Response) {
        let googleAccount;
        try {
            googleAccount = await GoogleServices.getAccountFromAuthToken(req.body.googleAuthToken as string, req.headers);
        } catch {
            unauthorized({ res });
            return void 0;
        }
        return await this.createUser(req, res, googleAccount, true);
    }

    async validateDevice(req: Request, res: Response, next: NextFunction) {
        const deviceService = new DeviceService(req.brandCode);

        deviceService.sanitize(req, 'device');

        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }
        return true;
    }

    // ---- Helpers ---- //
    private async createUser(req: Request, res: Response, userInfo: UserInfoInterface, fetchExistingUser = false) {
        const models = getModels(req.brandCode);
        if (fetchExistingUser) {
            let user: User | undefined;
            if (userInfo.email) {
                user = (await models.User.byEmail(userInfo.email)) ?? undefined;
            }
            if (!user && userInfo.customUserProperties.facebook_id) {
                user = (await models.User.byFacebookId(userInfo.customUserProperties.facebook_id)) ?? undefined;
            }

            if (user) {
                if (user.customUser.disabled) {
                    await user.customUser.update({
                        disabled: 0,
                    });
                }
                return user;
            }
        }

        try {
            const now = new Date();
            const user = await models.User.create({
                active: req.body.isBot ? 0 : 1,
                email: userInfo.email,
                created: now,
                last_login: now,
                webrole_id: req.body.role ? roleNameToRoleId(req.body.role as WebRoleName) : null,
                ...(userInfo.password ? User.passwordFields(userInfo.password) : {}),
                ...(req.body.minimalSignup
                    ? {}
                    : {
                          first_name: StringUtil.capitalizeFirstLetter(userInfo.firstName ?? ''),
                          last_name: StringUtil.capitalizeFirstLetter(userInfo.lastName ?? ''),
                      }),
            });

            await user.reload({ include: 'customUser' });
            user.customUser.set(userInfo.customUserProperties);
            const brandConfigSettings = config.getConfig(req.brandCode);

            if (user.isParent) {
                user.customUser.set('pref_babysitter', 1);
                user.customUser.set('pref_childminder', brandConfigSettings.showChildminders ? 1 : 0);
            }

            const countryLocale = await models.Locale.byId(req.localeId);
            if (countryLocale) {
                user.customUser.set('locale_id', req.localeId);
            }

            this.checkFreePremiumExpiryDate(user);

            await user.customUser.save();

            if (req.body.device) {
                const deviceService = new DeviceService(req.brandCode);
                await deviceService.createOrUpdate({
                    updated_at: new Date(),
                    device_type: req.body.device.deviceType as never,
                    fcm_token: req.body.device.fcmToken as string,
                    device_token: req.body.device.deviceToken as string,
                    webuser_id: user.webuser_id,
                });
            }

            if (userInfo.avatarUrl) {
                await optionalAwait(this.setAvatar(user, userInfo.avatarUrl));
            }

            await user.reload({
                include: {
                    association: 'customUser',
                    include: ['locale'],
                },
            });

            await optionalAwait(this.saveCreationInfo(req, user));

            return user;
        } catch (error) {
            if ((error as MysqlError).name === 'SequelizeUniqueConstraintError') {
                duplicateEmailError(res);
            } else {
                this.serverError(req, res, error as Error);
            }
            return undefined;
        }
    }

    private async setAvatar(user: User, avatarUrl: string) {
        const avatar = await new Promise<Uint8Array>(resolve => {
            request.get(avatarUrl, { encoding: null }, (error, response, body) => {
                resolve(body as Uint8Array);
            });
        });

        if (avatar) {
            try {
                await PhotoService.processPhoto({
                    base64Value: Buffer.from(avatar).toString('base64'),
                    validateAvatar: true,
                    user,
                });
                await user.customUser.save();
            } catch (error) {
                console.trace(error);
            }
        }
    }

    private checkFreePremiumExpiryDate(user: User) {
        const brandConfigSettings = config.getConfig(user.brandCode);
        if (brandConfigSettings.freePremiumExpiryDate) {
            const freePremiumExpiryDate = new Date(brandConfigSettings.freePremiumExpiryDate);
            if (isAfter(freePremiumExpiryDate, new Date())) {
                user.customUser.premium = freePremiumExpiryDate;
            }
        }
    }

    private saveCreationInfo(req: Request, user: User) {
        const info = RequestUtil.userAgentInfo(req);
        return user.sequelize.models.UserCreationInfo.create({
            webuser_id: user.webuser_id,
            device_type: info.device ?? null,
            sitly_platform: info.platform ?? null,
            utm_full_referrer: req.body.utmFullReferrer as string,
            utm_campaign: req.body.utmCampaign as string,
            utm_source: req.body.utmSource as string,
            utm_content: req.body.utmContent as string,
            utm_medium: req.body.utmMedium as string,
            utm_term: req.body.utmTerm as string,
        });
    }
}
