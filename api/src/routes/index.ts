import { SitlyRouter } from './sitly-router';
import { NextFunction, Request, Response } from 'express';
import { BaseRoute } from './route';

export class IndexRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.get('/', (_req: Request, res: Response, _next: NextFunction) => {
            res.status(204).json();
            return null;
        });
    }
}
