import { optionalAwait } from '../utils/util';
import { SitlyRouter } from './sitly-router';
import { Response } from 'express';
import { BaseRoute } from './route';
import { Error as JSONAPIError } from 'jsonapi-serializer';
import { serializeUser } from './users/user.serializer';
import { MysqlError } from 'mysql';
import { notFoundError, serverError } from '../services/errors';
import { getModels } from '../sequelize-connections';
import { UserRequest } from '../services/auth.service';

export class FavoritesRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.get<UserRequest>('/users/me/favorites', (req, res) => {
            return new FavoritesRoute().index(req, res);
        });
        router.post<UserRequest>('/users/me/favorites', (req, res) => {
            return new FavoritesRoute().create(req, res);
        });
        router.delete<UserRequest>('/users/me/favorites/:userId', (req, res) => {
            return new FavoritesRoute().delete(req, res);
        });
    }

    async index(req: UserRequest, res: Response) {
        try {
            let includes;
            try {
                includes = this.getIncludes(req, ['children', 'recommendations']);
            } catch (e) {
                return this.handleError(req, res, e);
            }

            const users = await req.user.getFavoriteUsers(includes);
            const ret = await serializeUser({
                data: users ?? [],
                contextUser: req.user,
                localeCode: req.locale,
            });
            res.json(ret);
        } catch (error) {
            this.serverError(req, res);
            console.trace(error);
        }
    }

    async create(req: UserRequest, res: Response) {
        try {
            req.sanitizeBody('userId').trim();
            req.checkBody('userId').notEmpty().withMessage({
                code: 'REQUIRED',
                title: 'userId is required',
            });
            if (await this.handleValidationResult(req, res)) {
                return;
            }

            const user = await getModels(req.brandCode).User.byUserUrl(req.body.userId as string);
            if (!user) {
                return notFoundError({ res, title: 'User not found' });
            }

            try {
                await getModels(req.brandCode).Favorite.create({
                    favorite_id: user.webuser_id,
                    webuser_id: req.user.webuser_id,
                    favorite_time: new Date(),
                });

                const ret = await serializeUser({ data: user, contextUser: req.user, localeCode: req.locale });
                await optionalAwait(req.user.updateLastSearchActivity(req));
                res.status(201).json(ret);
            } catch (error) {
                if ((error as MysqlError).name === 'SequelizeUniqueConstraintError') {
                    res.status(422);
                    res.json(
                        JSONAPIError({
                            code: 'DUPLICATE',
                            title: 'User is already a favorite',
                            source: {
                                parameter: 'userId',
                            },
                        }),
                    );
                    return void 0;
                } else {
                    this.serverError(req, res, error as Error);
                }
            }
        } catch (error) {
            this.serverError(req, res, error as Error);
        }
    }

    async delete(req: UserRequest, res: Response) {
        try {
            req.sanitizeParams('userId').trim();
            req.checkParams('userId').notEmpty().withMessage({
                code: 'REQUIRED',
                title: 'userId is required',
            });
            if (await this.handleValidationResult(req, res)) {
                return void 0;
            }

            const models = getModels(req.brandCode);

            const user = await models.User.byUserUrl(req.params.userId);
            if (!user) {
                return notFoundError({ res, title: 'User not found' });
            }

            const favorite = await models.Favorite.findOne({
                where: {
                    favorite_id: user.webuser_id,
                    webuser_id: req.user.webuser_id,
                },
            });
            if (!favorite) {
                return notFoundError({ res, title: 'Favorite not found' });
            }

            await favorite.destroy();
            res.status(204).json();
        } catch (error) {
            serverError(req, res, error as Error);
        }
    }
}
