import { SitlyRouter } from './sitly-router';
import { NextFunction, Request, Response } from 'express';
import { BaseRoute } from './route';
import { Serializer as JSONAPISerializer } from 'jsonapi-serializer';
import { request } from '../utils/util';
import { Environment } from '../services/env-settings.service';
import { unprocessableEntityError } from '../services/errors';

const tokenSerializer = new JSONAPISerializer('instagram-token', {
    attributes: ['instagramAccessToken', 'instagramUserId'],
    transform: (tokenResponse: Record<string, unknown>) => {
        return {
            id: 'instagram-access-token',
            instagramAccessToken: tokenResponse.access_token,
            instagramUserId: tokenResponse.user_id,
        };
    },
    keyForAttribute: 'camelCase',
});
export class InstagramTokensRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.post('/instagram-tokens', (req, res, next) => {
            return new InstagramTokensRoute().createToken(req, res, next);
        });
    }

    async createToken(req: Request, res: Response, next: NextFunction) {
        req.sanitizeBody('code').trim();
        req.sanitizeBody('redirectUri').trim();

        req.checkBody('code').notEmpty().withMessage({
            code: 'REQUIRED',
            title: 'Code is required',
        });
        req.checkBody('redirectUri').notEmpty().withMessage({
            code: 'REQUIRED',
            title: 'redirectUri is required',
        });

        const validationErrors = await this.handleValidationResult(req, res);
        if (validationErrors) {
            return void 0;
        }

        try {
            const { body, statusCode } = (await request({
                url: 'https://api.instagram.com/oauth/access_token',
                method: 'POST',
                form: {
                    client_id: Environment.apiKeys.instagram_app_id,
                    client_secret: Environment.apiKeys.instagram_client_secret,
                    grant_type: 'authorization_code',
                    redirect_uri: req.body.redirectUri as string,
                    code: req.body.code as string,
                },
            })) as { body: string; statusCode: number };
            const parsedBody = JSON.parse(body) as { error_message: string };

            if (statusCode >= 400) {
                return unprocessableEntityError({ res, title: parsedBody?.error_message });
            }

            res.status(201).json(tokenSerializer.serialize(parsedBody));
        } catch (e) {
            this.serverError(req, res, e as Error);
        }
    }
}
