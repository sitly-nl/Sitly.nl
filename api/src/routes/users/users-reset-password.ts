import { SitlyRouter } from '../sitly-router';
import { NextFunction, Request, Response } from 'express';
import { Error as JSONAPIError } from 'jsonapi-serializer';
import { UsersRoute } from './users';
import { SitlyToken, SitlyUserPasswordResetTokenData } from '../../sitly-token';
import { serializeUser } from './user.serializer';
import { BrandCode } from '../../models/brand-code';
import { LogService } from '../../services/log.service';
import { Environment } from '../../services/env-settings.service';
import { BaseRoute } from '../route';
import { ValidationRules } from '../../models/validation-rules';
import { CommonEmailsService } from '../../services/email/common-emails.service';
import { unprocessableEntityError } from '../../services/errors';
import { getMainModels, getModels } from '../../sequelize-connections';
import { User } from '../../models/user/user.model';
import { LinksService } from '../../services/links.service';

export class UsersResetPasswordRoute extends UsersRoute {
    static create(router: SitlyRouter) {
        router.post('/users/password-reset-token', (req, res, next) => {
            if ('validate' in req.query) {
                new UsersResetPasswordRoute().validatePasswordResetToken(req, res, next);
                return null;
            } else {
                return new UsersResetPasswordRoute().createPasswordResetToken(req, res, next);
            }
        });

        router.post('/users/password', (req, res, next) => {
            return new UsersResetPasswordRoute().resetPassword(req, res, next);
        });
    }

    validatePasswordResetToken(req: Request, res: Response, next: NextFunction) {
        // todo check if email exists in DB
        req.checkBody('token').notEmpty().withMessage({
            code: 'REQUIRED',
            title: 'Token is required',
        });
        req.getValidationResult().then(errors => {
            if (!errors.isEmpty()) {
                res.status(422);
                const serializedErrors = JSONAPIError(errors.array().map(BaseRoute.errorMapper));
                res.json(serializedErrors);
            } else {
                const sitlyToken = new SitlyToken();
                const data = sitlyToken.read(req.body.token as string);
                if (data) {
                    const serializedErrors = JSONAPIError([]);
                    res.json(serializedErrors);
                } else {
                    res.status(422);
                    const serializedErrors = JSONAPIError({
                        code: 'INVALID_TOKEN',
                        title: 'Token malformed or expired',
                        source: {
                            parameter: 'token',
                        },
                    });
                    res.json(serializedErrors);
                }
            }
        });
    }

    async createPasswordResetToken(req: Request, res: Response, next: NextFunction) {
        req.sanitizeBody('email').trim();
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
        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }

        let brandCodes;
        const email = req.body.email as string;
        if (req.brandCode === BrandCode.main) {
            brandCodes = (await getMainModels().UserCountry.byEmail(email))?.map(item => item.country_code) ?? [];
        } else {
            brandCodes = [req.brandCode];
        }

        if (brandCodes.length === 0 || email.trim().endsWith('.ru')) {
            return unprocessableEntityError({
                res,
                code: 'NOT_FOUND',
                title: 'Email not found',
                source: { parameter: 'email' },
            });
        }

        const results = await Promise.all(
            brandCodes.map(async brandCode => {
                const user = await getModels(brandCode).User.byEmail(email);
                if (user) {
                    let returnValue;
                    if (user.customUser.facebook_id) {
                        const url = user.customUser.completed ? LinksService.loginUrl(user) : LinksService.completionUrl(user);
                        await CommonEmailsService.sendLoginLink(user, url);
                        returnValue = url;
                    } else {
                        const token = SitlyToken.resetPasswordToken(req.body.email as string);
                        CommonEmailsService.sendForgotPassword(user, LinksService.resetPasswordUrl(brandCode, token));
                        returnValue = token;
                    }
                    return returnValue;
                } else {
                    return undefined;
                }
            }),
        );

        if (results.filter(Boolean).length !== brandCodes.length) {
            return unprocessableEntityError({
                res,
                title: 'Email not found',
                code: 'NOT_FOUND',
                source: { parameter: 'email' },
            });
        }
        if (Environment.isApiTests) {
            res.status(201).send(results);
        } else {
            res.status(204).json();
        }
    }

    async resetPassword(req: Request, res: Response, next: NextFunction) {
        req.sanitizeBody('password').trim();

        req.checkBody('token').notEmpty().withMessage({
            code: 'REQUIRED',
            title: 'Token is required',
        });

        req.checkBody('password')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'Password is required',
            })
            .isLength(ValidationRules.user.password.length)
            .withMessage({
                code: 'INVALID_LENGTH',
                title: `Password length must be between ${ValidationRules.user.password.length.min} and ${ValidationRules.user.password.length.max} characters long`,
            });
        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }

        const sitlyToken = new SitlyToken();
        const data = sitlyToken.read<SitlyUserPasswordResetTokenData>(req.body.token as string);

        const error = JSONAPIError({
            code: 'INVALID_TOKEN',
            title: 'Token malformed or expired',
            source: {
                parameter: 'token',
            },
        });
        if (!data) {
            res.status(422);
            res.json(error);
        } else {
            const email = data.data?.email;
            if (!email) {
                res.status(422);
                res.json(error);
            } else {
                let countryCode: BrandCode;
                if (req.brandCode === BrandCode.main) {
                    const userCountry = (await getMainModels().UserCountry.byEmail(email))?.[0];
                    countryCode = userCountry.country_code;
                } else {
                    countryCode = req.brandCode;
                }
                const user = await getModels(countryCode).User.byEmail(email);
                if (!user) {
                    res.status(422);
                    res.json(error);
                } else {
                    let includes: string[] = [];
                    try {
                        const possibleUserIncludes = this.userPrivateAllowedIncludes.map(item => `user.${item}`);
                        includes = this.getIncludes(req, [...possibleUserIncludes, 'access-token']);
                        includes = includes.map(item => item.replace('user.', ''));
                    } catch (e) {
                        this.serverError(req, res, e as Error);
                    }

                    if (includes.includes('user')) {
                        res.status(200);

                        await user.customUser.reload({ include: this.userPrivateAllowedIncludes });

                        let reEnabled = false;
                        if (user.customUser.disabled === 1) {
                            await user.customUser.update({
                                disabled: 0,
                            });
                            reEnabled = true;
                        }

                        const serializedUser = await serializeUser({
                            data: user,
                            contextUser: user,
                            localeCode: req.locale,
                            includes,
                            customSetter: (user, userResponse) => {
                                userResponse.reEnabled = reEnabled;
                                if (includes.includes('access-token')) {
                                    userResponse.accessToken = {
                                        id: 'access-token',
                                        countryCode,
                                        token: SitlyToken.accessToken(user),
                                    };
                                }
                                if (req.cmsAuthenticated) {
                                    userResponse.internalUserId = user.webuser_id;
                                }
                            },
                        });
                        res.json(serializedUser);
                    } else {
                        res.status(204);
                        res.json();
                    }

                    user.update(User.passwordFields(req.body.password as string));
                    delete req.body.token;
                    LogService.logRequest({
                        req,
                        label: 'user.resetPassword.success',
                        message: `platform=${req.get('User-Agent')}, email=${user.email}`,
                        user,
                    });
                }
            }
        }
    }
}
