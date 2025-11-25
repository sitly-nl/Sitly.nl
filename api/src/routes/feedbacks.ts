import { config } from './../../config/config';
import { SitlyRouter } from './sitly-router';
import { Response } from 'express';
import { BaseRoute } from './route';
import { forbiddenError, notFoundError } from '../services/errors';
import { TrustPilotService } from '../services/trustpilot.service';
import { getModels } from '../sequelize-connections';
import { EkomiService } from '../services/ekomi-service.service';
import { UserRequest } from '../services/auth.service';

export class FeedbacksRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.post<UserRequest>('/feedbacks', (req, res) => {
            return new FeedbacksRoute().create(req, res);
        });
        router.get<UserRequest>('/feedbacks/ekomi', (req, res) => {
            return new FeedbacksRoute().redirectToEkomi(req, res);
        });
        router.get<UserRequest>('/feedbacks/trustpilot', (req, res) => {
            return new FeedbacksRoute().redirectToTrustpilot(req, res);
        });
        router.get<UserRequest>('/feedbacks/google', (req, res) => {
            return new FeedbacksRoute().redirectToGoogle(req, res);
        });
    }

    async create(req: UserRequest, res: Response) {
        req.checkBody('category').notEmpty().withMessage({
            code: 'REQUIRED',
            title: 'Category is required',
        });
        req.checkBody('description').notEmpty().withMessage({
            code: 'REQUIRED',
            title: 'Description is required',
        });
        if (await this.handleValidationResult(req, res)) {
            return;
        }

        await getModels(req.brandCode).Feedback.create({
            webuser_id: req.user.webuser_id,
            category: req.body.category as string,
            feedback: req.body.description as string,
        });

        res.status(204).json();
    }

    async redirectToEkomi(req: UserRequest, res: Response) {
        const brandConfigSettings = config.getConfig(req.brandCode);
        const auth = brandConfigSettings?.ekomiAuth;
        if (auth) {
            const models = getModels(req.brandCode);
            const message = await models.Message.getLastMessage(req.user.webuser_id);
            const messageId = message?.instance_id;
            if (!messageId) {
                return notFoundError({ res, title: 'Message not found' });
            }

            const ekomiLink = await EkomiService.ekomiLink(auth, messageId);
            req.user.customUser.update({ ekomi_rated: 1 });
            await models.CoreSetting.setNumberOfEkomiOrders(+(await models.CoreSetting.numberOfEkomiOrders()) + 1);

            res.status(200).json({ links: { ekomi: ekomiLink } });
        } else {
            forbiddenError({ res, title: 'This is not allowed in your country' });
        }
    }

    async redirectToTrustpilot(req: UserRequest, res: Response) {
        const trustpilotUrl = await TrustPilotService.getReviewUrl(req.user, req.locale.replace('_', '-'));
        if (trustpilotUrl) {
            req.user.customUser.update({ ekomi_rated: 1 });
            const { CoreSetting } = getModels(req.brandCode);
            await CoreSetting.setNumberOfTrustPilotOrders(+(await CoreSetting.numberOfTrustPilotOrders()) + 1);
            res.status(200).json({ links: { trustpilot: trustpilotUrl } });
        } else {
            forbiddenError({ res, title: 'This is not allowed in your country' });
        }
    }

    async redirectToGoogle(req: UserRequest, res: Response) {
        const url = config.getConfig(req.brandCode).googleReviewUrl;
        if (url) {
            req.user.customUser.update({ ekomi_rated: 1 });
            const { CoreSetting } = getModels(req.brandCode);
            await CoreSetting.setNumberOfGoogleReviewOrders(+(await CoreSetting.numberOfGoogleReviewOrders()) + 1);
            res.status(200).json({ links: { google: url } });
        } else {
            forbiddenError({ res, title: 'This is not allowed in your country' });
        }
    }
}
