import { SitlyRouter } from '../sitly-router';
import { Request, Response } from 'express';
import { BaseRoute } from '../route';
import { notFoundError } from '../../services/errors';
import { getModels } from '../../sequelize-connections';

export class GemSitlyUsersRecommendationsRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.delete('/gem/sitly-users/:userId/recommendations/:recId', (req, res) => {
            return new GemSitlyUsersRecommendationsRoute().delete(req, res);
        });
    }

    async delete(req: Request, res: Response) {
        const { userId, recId } = req.params;

        const models = getModels(req.brandCode);
        const recommendation = await models.Recommendation.findByPk(parseInt(recId, 10));
        if (!recommendation) {
            return notFoundError({ res, title: 'Recommendation not found' });
        }

        const userWithRecommendation = await models.User.byId(parseInt(userId, 10));
        if (!userWithRecommendation) {
            return notFoundError({ res, title: 'User not found' });
        }

        if (recommendation.webuser_id !== userWithRecommendation.webuser_id) {
            return notFoundError({ res, title: 'Recommendation not found for requested user' });
        }

        await recommendation.destroy();
        res.status(204).json('');
    }
}
