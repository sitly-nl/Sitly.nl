import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { Environment } from './../services/env-settings.service';
import { SitlyRouter } from './sitly-router';
import { BaseRoute } from './route';
import { FeaturesService } from '../services/features/features.service';
import { GrowthbookProjectId, growthbookProjectIds } from '../services/features/growthbook-types';

export class FeaturesRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.get('/features', (req, res) => {
            return new FeaturesRoute().index(req, res);
        });

        router.post('/features/recache', (req, res) => {
            return new FeaturesRoute().recache(req, res);
        });
    }

    private async index(req: Request, res: Response) {
        req.checkQuery('projectId').notEmpty().isString().isIn(growthbookProjectIds).withMessage({
            code: 'INVALID_VALUE',
            title: 'invalid project id',
        });

        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }

        try {
            const features = await FeaturesService.getFeatures(req.query.projectId as GrowthbookProjectId, req.brandCode);
            res.status(200).json(features);
        } catch (error) {
            return this.serverError(req, res, error as Error);
        }
    }

    private async recache(req: Request, res: Response) {
        const webhookSecret = Environment.apiKeys.growthbook.webhook_secret;

        req.checkHeaders('X-GrowthBook-Signature')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'proper headers are required',
            })
            .callback((value: string) => {
                if (!value) {
                    return false;
                }
                const computed = crypto.createHmac('sha256', webhookSecret).update(JSON.stringify(req.body)).digest('hex');
                return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(value));
            })
            .withMessage({
                code: 'INVALID_VALUE',
                title: 'proper header value is required',
            });

        req.checkBody('features')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'features are required',
            })
            .callback((value: object) => {
                return typeof value === 'object';
            })
            .withMessage({
                code: 'INVALID_VALUE',
                title: 'invalid features value',
            });

        req.checkQuery('projectId').notEmpty().isString().isIn(growthbookProjectIds).withMessage({
            code: 'INVALID_VALUE',
            title: 'invalid project id',
        });
        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }

        if (req.query.projectId === GrowthbookProjectId.webApp) {
            await FeaturesService.recacheFeatures(GrowthbookProjectId.webApp, req.brandCode);
            return res.status(204).send('');
        }
        res.status(200).send('');
    }
}
