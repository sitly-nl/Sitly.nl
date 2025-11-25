import { Request, Response } from 'express';
import { BaseRoute } from '../route';
import { SitlyRouter } from '../sitly-router';
import { Environment } from '../../services/env-settings.service';
import { serializeCountry } from '../../models/serialize/country-response';

export class CountriesRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.get('/countries', (req, res) => {
            return new CountriesRoute().index(req, res);
        });
    }

    async index(req: Request, res: Response) {
        const brands = Environment.brands;
        res.json(
            await serializeCountry(
                brands.map(item => {
                    return { country_code: item.id };
                }),
                req.localeId,
            ),
        );
    }
}
