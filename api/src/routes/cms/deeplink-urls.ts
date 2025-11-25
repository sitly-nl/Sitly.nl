import { SitlyRouter } from '../sitly-router';
import { Request, Response } from 'express';
import { BaseRoute } from './../route';
import { config } from './../../../config/config';
import { Environment } from '../../services/env-settings.service';
import { Util } from '../../utils/util';

export class CmsDeeplinkUrlsRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.get('/cms/deeplink-urls', (req, res) => {
            return new CmsDeeplinkUrlsRoute().index(req, res);
        });
    }

    async index(req: Request, res: Response) {
        const deviceTypes = ['ios'];
        req.checkQuery('deviceType')
            .optional()
            .withMessage({
                code: 'REQUIRED',
                title: 'Device type is required',
            })
            .isIn(deviceTypes)
            .withMessage({
                code: 'INVALID_VALUE',
                title: 'Device type can only be either android, ios or web',
            });
        if (await this.handleValidationResult(req, res)) {
            return;
        }

        const ret = Environment.brands.map(brand => {
            const brandConfigSettings = config.getConfig(brand.id);
            const res = {
                country: brand.country,
                links: {
                    profile: [] as string[],
                    settings: [] as string[],
                    password: [] as string[],
                    chat: [] as string[],
                    main: [`${brandConfigSettings.url}/\\?tempToken=.*`],
                },
            };

            Util.entries(res.links).forEach(([key, value]) => {
                res.links[key] = value.map(item =>
                    item
                        .replace(':userId', '[a-z0-9]+')
                        .replace(':tokenCode', '[a-zA-Z0-9]+')
                        .replace(':placeId', '.*')
                        .replace(':token', 'ey.*')
                        .replace(':wildcard', '.*'),
                );
            });

            return res;
        });

        res.json(ret);
    }
}
