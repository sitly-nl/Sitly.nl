import { SentryService } from './../services/sentry.service';
import { NextFunction, Request, Response, Router } from 'express';

export class SitlyRouter {
    constructor(private router: Router) {}

    get<T extends Request = Request>(path: string, callback: (req: T, res: Response, next: NextFunction) => Promise<unknown> | null) {
        this.router.get(path, (req, res, next) => {
            callback(req as T, res, next)?.catch(error => {
                this.sendErrorToSentry(req, error);
                next(error);
            });
        });
    }

    post<T extends Request = Request>(path: string, callback: (req: T, res: Response, next: NextFunction) => Promise<unknown> | null) {
        this.router.post(path, (req, res, next) => {
            callback(req as T, res, next)?.catch(error => {
                this.sendErrorToSentry(req, error);
                next(error);
            });
        });
    }

    patch<T extends Request = Request>(path: string, callback: (req: T, res: Response, next: NextFunction) => Promise<unknown> | null) {
        this.router.patch(path, (req, res, next) => {
            callback(req as T, res, next)?.catch(error => {
                this.sendErrorToSentry(req, error);
                next(error);
            });
        });
    }

    delete<T extends Request = Request>(path: string, callback: (req: T, res: Response, next: NextFunction) => Promise<unknown> | null) {
        this.router.delete(path, (req, res, next) => {
            callback(req as T, res, next)?.catch(error => {
                this.sendErrorToSentry(req, error);
                next(error);
            });
        });
    }

    private sendErrorToSentry(req: Request, error: unknown) {
        SentryService.captureException(error, 'sitlyRouter', req.brandCode, {
            url: req.url,
            headers: req.headers,
            body: req.body,
        });
    }
}
