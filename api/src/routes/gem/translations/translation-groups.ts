import { Request, Response } from 'express';
import { MysqlError } from 'mysql';
import { serialize } from '../../../models/serialize/translation-group-response';
import { getTranslationModels } from '../../../sequelize-connections';
import { unprocessableEntityError } from '../../../services/errors';
import { BaseRoute } from '../../route';
import { SitlyRouter } from '../../sitly-router';

export class TranslationGroupsRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.get('/gem/translation-groups', (req, res) => {
            return new TranslationGroupsRoute().list(req, res);
        });

        router.post('/gem/translation-groups', (req, res) => {
            return new TranslationGroupsRoute().createGroup(req, res);
        });
    }

    async list(_req: Request, res: Response) {
        const groups = await getTranslationModels().TranslationGroup.findAll();
        res.json(serialize(groups));
    }

    async createGroup(req: Request, res: Response) {
        req.checkBody('groupName')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'groupName is required',
            })
            .isString()
            .withMessage({
                code: 'INVALID_VALUE',
                title: 'groupName should be a string',
            });
        if (await this.handleValidationResult(req, res)) {
            return;
        }

        try {
            const group = await getTranslationModels().TranslationGroup.create({
                group_name: req.body.groupName as string,
            });
            res.status(201).json(serialize(group));
        } catch (error) {
            if ((error as MysqlError).name === 'SequelizeUniqueConstraintError') {
                return unprocessableEntityError({
                    res,
                    title: 'Group with this name already exist',
                });
            } else {
                return this.serverError(req, res, error as Error);
            }
        }
    }
}
