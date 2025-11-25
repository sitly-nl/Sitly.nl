import { SitlyRouter } from '../sitly-router';
import { NextFunction, Request, Response } from 'express';
import { BaseRoute } from '../route';
import { LogService } from '../../services/log.service';
import { SitlyToken } from '../../sitly-token';
import { BrandCode } from '../../models/brand-code';
import { serializeGemUser } from '../../models/serialize/gem-user-response';
import { authenticator } from 'otplib';
import { notFoundError, unauthorized } from '../../services/errors';
import { getMainModels } from '../../sequelize-connections';
import { GemUser } from '../../models/gem/gem-user.model';

export class GemTokensRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.post('/gem/tokens', (req, res, next) => {
            return new GemTokensRoute().createToken(req, res, next);
        });
    }

    private sanitizeCreate(req: Request) {
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

        req.checkBody('password').notEmpty().withMessage({
            code: 'REQUIRED',
            title: 'Password is required',
        });

        req.checkBody('otp')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'otp is required',
            })
            .isInt()
            .withMessage({
                code: 'INVALID_FORMAT',
                title: 'otp must be a number',
            });
        return req;
    }

    private validateEndpoint = (req: Request, res: Response) => {
        if (req.brandCode !== BrandCode.main) {
            notFoundError({ res, title: 'Endpoint not found' });
            return false;
        }
        return true;
    };

    private getToken = (req: Request, res: Response, gemUser: GemUser) => {
        try {
            return SitlyToken.gemAccessToken(gemUser);
        } catch (error) {
            console.trace(error);
            unauthorized({ res });
            LogService.logRequest({ req, label: 'gem.signIn.error.parseAuthResult', message: (error as Error).message, user: undefined });
            return false;
        }
    };

    private checkOtp(res: Response, otp: string, secret: string) {
        const success = authenticator.check(otp, secret);
        if (!success) {
            unauthorized({ res });
        }
        return success;
    }

    async createToken(req: Request, res: Response, next: NextFunction) {
        try {
            if (!this.validateEndpoint(req, res)) {
                return void 0;
            }
            req = this.sanitizeCreate(req);
            if (await this.handleValidationResult(req, res)) {
                return void 0;
            }

            const gemUser = await getMainModels().GemUser.login(req.body.email as string, req.body.password as string);
            if (!gemUser) {
                LogService.logRequest({
                    req,
                    label: 'gem.signIn.error.noSuchGemUser',
                    message: `email=${req.body.email}`,
                    user: undefined,
                });
                return unauthorized({ res });
            }

            const otpSuccess = this.checkOtp(res, req.body.otp as string, gemUser.tfa_secret);
            if (!otpSuccess) {
                return void 0;
            }

            const token = this.getToken(req, res, gemUser);
            if (!token) {
                return void 0;
            }
            const response = serializeGemUser(gemUser);
            response.meta = {
                accessToken: token,
            };
            res.status(201);
            res.json(response);
            LogService.logRequest({
                req,
                label: 'gem.signIn.general',
                message: `platform=${req.get('User-Agent')}, email=${gemUser.email}`,
                user: undefined,
            });
        } catch (error) {
            console.trace('err', error);
            this.serverError(req, res);
            LogService.logRequest({
                req,
                label: 'gem.signIn.error.server',
                user: undefined,
            });
            return void 0;
        }
    }
}
