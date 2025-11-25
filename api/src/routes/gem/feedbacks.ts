import { SitlyRouter } from '../sitly-router';
import { Request, Response } from 'express';
import { BaseRoute } from '../route';
import { validatePage } from '../common-validators';
import { getModels } from '../../sequelize-connections';
import { serialize } from '../../models/serialize/feedback-response';
import { allUserRoleIds } from '../../models/user/user.model';

export class GemFeedbacksRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.get('/gem/feedbacks', (req, res) => {
            return new GemFeedbacksRoute().index(req, res);
        });
    }

    async index(req: Request, res: Response) {
        const page = validatePage({ req });
        let webroleId;
        req.checkQuery('filter.webroleId')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'webroleId is required',
            })
            .custom((value: string) => {
                webroleId = parseInt(value, 10);
                return allUserRoleIds.includes(webroleId);
            })
            .withMessage({
                code: 'INVALID_VALUE',
                title: `webroleId must be one of ${allUserRoleIds}`,
            });
        if ((await this.handleValidationResult(req, res)) || !webroleId) {
            return;
        }

        const feedbacks = await getModels(req.brandCode).Feedback.find({
            webroleId,
            page,
        });
        res.json(await serialize(feedbacks.rows, page?.responseMeta(feedbacks.count)));
    }
}
