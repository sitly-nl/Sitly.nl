import { SitlyRouter } from './sitly-router';
import { Request, Response } from 'express';
import { BaseRoute } from './route';
import { ElasticService } from '../services/elastic.service';
import { getModels } from '../sequelize-connections';

export class ElasticSearchRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.post('/elastic-search/users/sync', (req, res) => {
            return new ElasticSearchRoute().sync(req, res);
        });

        router.get('/elastic-search/check', (req, res) => {
            return new ElasticSearchRoute().check(req, res);
        });
    }

    async sync(req: Request, res: Response) {
        req.checkBody('users')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'users parameter is required',
            })
            .callback((users: string | number[]) => {
                if (Array.isArray(users)) {
                    return users.filter(userId => isNaN(userId)).length === 0;
                } else if (typeof users === 'string') {
                    return ['all', 'new', 'outdated', 'updated'].includes(users);
                }
                return false;
            })
            .withMessage({
                code: 'INVALID_FORMAT',
                title: 'users parameter must be one of number[],all,new,outdated',
            });

        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }

        const elasticService = ElasticService.getSearchInstance(req.brandCode);
        elasticService.on('sync_start', pageCount => {
            console.log('pageCount', pageCount);
        });

        await elasticService.syncUsers(req.brandCode, req.body.users as never, !!req.body.refresh);
        res.status(204);
        res.json();
    }

    async check(req: Request, res: Response) {
        try {
            const user = await getModels(req.brandCode).User.findOne({
                where: { active: 1 },
                include: {
                    association: 'customUser',
                    where: {
                        disabled: 0,
                        deleted: 0,
                    },
                },
                rejectOnEmpty: true,
            });
            await ElasticService.getSearchInstance(req.brandCode).syncUsers(req.brandCode, [user.webuser_id]);
            res.status(200).json();
        } catch (e) {
            this.serverError(req, res, e as Error);
        }
    }
}
