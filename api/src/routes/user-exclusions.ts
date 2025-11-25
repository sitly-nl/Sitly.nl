import { Response } from 'express';
import { SitlyRouter } from './sitly-router';
import { BaseRoute } from './route';
import { getModels } from '../sequelize-connections';
import { UserExclusionType } from '../models/user-exclusion.model';
import { notFoundError, unprocessableEntityError } from '../services/errors';
import { serializeUser } from './users/user.serializer';
import { UserRequest } from '../services/auth.service';
import { CustomUser } from '../models/user/custom-user.model';

export class ExclusionsRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.get<UserRequest>('/users/me/exclusions/hidden', (req, res) => {
            return new ExclusionsRoute().index(req, res);
        });
        router.post<UserRequest>('/users/me/exclusions', (req, res) => {
            return new ExclusionsRoute().create(req, res);
        });

        router.delete<UserRequest>('/users/me/exclusions/:userId', (req, res) => {
            return new ExclusionsRoute().delete(req, res);
        });
    }

    async index(req: UserRequest, res: Response) {
        await req.user.reload({
            include: {
                association: 'customUser',
                include: ['hiddenExclusions'],
            },
        });
        const users = await req.user.sequelize.models.User.findAll({
            where: { webuser_id: req.user.customUser.hiddenExclusions.map(item => item.webuser_id) },
            include: {
                association: 'customUser',
                include: CustomUser.includes(['children', 'recommendations']),
            },
        });

        const ret = await serializeUser({
            data: users,
            contextUser: req.user,
            localeCode: req.locale,
        });
        res.json(ret);
    }

    async create(req: UserRequest, res: Response) {
        const possibleTypes = Object.values(UserExclusionType);
        req.checkBody('type')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'type is required',
            })
            .isIn(possibleTypes)
            .withMessage({
                code: 'INVALID_VALUE',
                title: `Invalid type, must be one of ${possibleTypes}`,
            });

        req.checkBody('userId').notEmpty().withMessage({
            code: 'REQUIRED',
            title: 'userId is required',
        });
        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }
        if (req.body.userId === req.user.customUser.webuser_url) {
            return unprocessableEntityError({
                res,
                title: 'Cannot block self',
                source: {
                    parameter: 'userId',
                },
            });
        }
        const models = getModels(req.brandCode);
        const excludedUser = await models.User.byUserUrl(req.body.userId as string);
        if (!excludedUser) {
            return notFoundError({ res, title: 'User not found' });
        }

        await Promise.all([
            models.UserExclusion.create({
                webuser_id: req.user.webuser_id,
                exclude_webuser_id: excludedUser.webuser_id,
                exclude_type: req.body.type as UserExclusionType,
            }),
            models.Favorite.destroy({
                where: {
                    favorite_id: excludedUser.webuser_id,
                    webuser_id: req.user.webuser_id,
                },
            }),
        ]);

        res.status(201);
        res.json();
    }

    async delete(req: UserRequest, res: Response) {
        req.checkParams('userId').notEmpty().withMessage({
            code: 'REQUIRED',
            title: 'userId is required',
        });
        if (await this.handleValidationResult(req, res)) {
            return;
        }

        const models = req.user.sequelize.models;
        const user = await models.User.byUserUrl(req.params.userId);
        if (!user) {
            return notFoundError({ res, title: 'User not found' });
        }

        const exclusion = await models.UserExclusion.findOne({
            where: {
                webuser_id: req.user.webuser_id,
                exclude_webuser_id: user.webuser_id,
                exclude_type: UserExclusionType.hidden,
            },
        });
        if (!exclusion) {
            return notFoundError({ res, title: 'Exclusion not found' });
        }

        await exclusion.destroy();
        res.status(204).json();
    }
}
