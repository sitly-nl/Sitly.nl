import { SitlyRouter } from './sitly-router';
import { Request, Response } from 'express';
import { BaseRoute } from './route';
import { getModels } from '../sequelize-connections';
import { serialize } from '../models/serialize/locale-response';

export class LocalesRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.get('/locales', (req, res) => {
            return new LocalesRoute().index(req, res);
        });
        router.get('/gem/locales', (req, res) => {
            return new LocalesRoute().index(req, res);
        });
    }

    async index(req: Request, res: Response) {
        const locales = await getModels(req.brandCode).Locale.findAll({
            where: { active: 1 },
        });
        res.json(serialize(locales));
    }
}
