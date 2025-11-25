import { SitlyRouter } from './sitly-router';
import { Request, Response } from 'express';
import { BaseRoute } from './route';
import { CacheService, CachingKeys } from '../services/cache.service';

export class CacheRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.post('/cache/reset', (req, res) => {
            return new CacheRoute().reset(req, res);
        });
    }

    private async reset(req: Request, res: Response) {
        req.checkBody('key')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'key is required',
            })
            .isIn(Object.values(CachingKeys))
            .withMessage({
                code: 'INVALID_VALUE',
                title: `type must be in: ${Object.values(CachingKeys)}`,
            });
        if (await this.handleValidationResult(req, res)) {
            return;
        }

        await CacheService.clearCache(req.body.key as CachingKeys);
        res.status(204).json();
    }
}
