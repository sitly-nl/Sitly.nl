import { SitlyRouter } from '../../sitly-router';
import { Request, Response } from 'express';
import { BaseRoute } from '../../route';
import { getModels } from '../../../sequelize-connections';
import { serialize } from '../../../models/serialize/subscription-response';
import { forbiddenError, notFoundError } from '../../../services/errors';
import { Util } from '../../../utils/util';
import { validateCreate, validateCreateTestVariant, validateUpdate } from './subscription-validation';
import { WebRoleId, allUserRoleIds } from '../../../models/user/user.model';

export class GemSubscriptionsRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.get('/gem/subscriptions', (req, res) => {
            return new GemSubscriptionsRoute().index(req, res);
        });
        router.post('/gem/subscriptions', (req, res) => {
            return new GemSubscriptionsRoute().create(req, res);
        });
        router.patch('/gem/subscriptions/:subscriptionId', (req, res) => {
            return new GemSubscriptionsRoute().update(req, res);
        });
        router.post('/gem/subscriptions/:subscriptionId', (req, res) => {
            return new GemSubscriptionsRoute().createTestVariant(req, res);
        });
        router.delete('/gem/subscriptions/:subscriptionId', (req, res) => {
            return new GemSubscriptionsRoute().delete(req, res);
        });
    }

    async index(req: Request, res: Response) {
        const filter: { webroleId?: WebRoleId; showInOverview?: 0 | 1 } = {};
        req.checkQuery('filter.webroleId')
            .optional()
            .custom((value: string) => {
                filter.webroleId = parseInt(value, 10);
                return allUserRoleIds.includes(filter.webroleId);
            })
            .withMessage({
                code: 'INVALID_VALUE',
                title: `webroleId must be one of ${allUserRoleIds}`,
            });
        req.checkQuery('filter.showInOverview')
            .optional()
            .custom((value: string) => {
                filter.showInOverview = parseInt(value, 10) as 0 | 1;
                return [0, 1].includes(filter.showInOverview);
            })
            .withMessage({
                code: 'INVALID_VALUE',
                title: 'showInOverview must be 0 or 1',
            });
        if (await this.handleValidationResult(req, res)) {
            return;
        }

        const subscriptions = await getModels(req.brandCode).Subscription.find(filter);
        res.json(serialize(subscriptions, 'gem'));
    }

    async create(req: Request, res: Response) {
        const body = req.body as {
            duration: number;
            durationUnit: 'days' | 'weeks' | 'months' | 'years';
            pricePerUnit: number;
            webroleId: WebRoleId;
            maxAge?: number;
            showInOverview?: 0 | 1;
        };
        validateCreate(req);
        if (await this.handleValidationResult(req, res)) {
            return;
        }

        const subscription = await getModels(req.brandCode).Subscription.create({
            duration: body.duration,
            duration_unit: body.durationUnit,
            price_per_unit: body.pricePerUnit,
            webrole_id: body.webroleId,
            ...Util.pickDefinedValues({
                max_age: body.maxAge,
                show_in_overview: body.showInOverview,
            }),
        });
        res.json(serialize(subscription, 'gem'));
    }

    async update(req: Request, res: Response) {
        const models = getModels(req.brandCode);
        const subscriptionId = req.params.subscriptionId;
        const body = req.body as {
            duration?: number;
            durationUnit?: 'days' | 'weeks' | 'months' | 'years';
            pricePerUnit?: number;
            webroleId?: WebRoleId;
            maxAge?: number;
            showInOverview?: 0 | 1;
        };
        validateUpdate(req);
        if (await this.handleValidationResult(req, res)) {
            return;
        }

        const subscription = await models.Subscription.findByPk(subscriptionId);
        if (!subscription) {
            return notFoundError({ res, title: 'Subscription not found' });
        }

        if (
            (body.duration !== undefined || body.durationUnit !== undefined || body.pricePerUnit !== undefined) &&
            (await models.Subscription.isUsed(subscriptionId))
        ) {
            return forbiddenError({ res, title: "duration, durationUnit & pricePerUnit values of used subscription can't be updated" });
        }

        await subscription.update(
            Util.pickDefinedValues({
                duration: body.duration,
                duration_unit: body.durationUnit,
                price_per_unit: body.pricePerUnit,
                webrole_id: body.webroleId,
                max_age: body.maxAge,
                show_in_overview: body.showInOverview,
            }),
        );
        res.json(serialize(subscription, 'gem'));
    }

    async createTestVariant(req: Request, res: Response) {
        const models = getModels(req.brandCode);
        const subscriptionId = req.params.subscriptionId;
        const body = req.body as {
            duration: number;
            durationUnit: 'days' | 'weeks' | 'months' | 'years';
            pricePerUnit: number;
            abTestId: string;
        };
        validateCreateTestVariant(req);
        if (await this.handleValidationResult(req, res)) {
            return;
        }

        const subscription = await models.Subscription.findByPk(subscriptionId);
        if (!subscription) {
            return notFoundError({ res, title: 'Subscription not found' });
        }
        if (subscription.original_subscription_id !== null) {
            return forbiddenError({
                res,
                title: "Test variant can't be created on subscription which is variant of another subscription",
            });
        }

        await models.Subscription.create({
            ...subscription.dataValues,
            instance_id: undefined,
            original_subscription_id: subscription.instance_id,
            duration: body.duration,
            duration_unit: body.durationUnit,
            price_per_unit: body.pricePerUnit,
            ab_test_id: body.abTestId,
        });
        await subscription.reload({ include: 'testVariant' });
        res.json(serialize(subscription, 'gem'));
    }

    async delete(req: Request, res: Response) {
        const models = getModels(req.brandCode);
        const subscriptionId = req.params.subscriptionId;

        if (await models.Subscription.isUsed(subscriptionId)) {
            return forbiddenError({ res, title: "Used subscription can't be deleted" });
        }

        await models.Subscription.destroy({ where: { instance_id: subscriptionId } });

        res.status(204).json();
    }
}
