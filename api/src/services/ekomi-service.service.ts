import { BrandCode } from '../models/brand-code';
import { getModels } from '../sequelize-connections';
import { request } from '../utils/util';
import { SentryService } from './sentry.service';

export interface EkomiFeedback {
    submitted: string;
    order_id: string;
    rating: string;
    review: string;
}

export class EkomiService {
    private static baseUrl = 'https://api.ekomi.de/v3';

    static async syncRatings(ekomiFeedbacks: EkomiFeedback[], brandCode: BrandCode) {
        const models = getModels(brandCode);

        const ekomiFeedbackIds = ekomiFeedbacks.map(ekomiFeedbacks => parseInt(ekomiFeedbacks.order_id, 10));
        const existingDbFeedbacks = await models.Rating.findAll({
            where: {
                transaction_id: ekomiFeedbackIds,
            },
        });

        const existingFeedbacksIdsSet = new Set(existingDbFeedbacks.map(feedback => feedback.transaction_id));
        const nonExistingFeedbacks = ekomiFeedbacks.filter(feedback => !existingFeedbacksIdsSet.has(parseInt(feedback.order_id, 10)));

        const batchSize = 100;
        for (let i = 0; i < nonExistingFeedbacks.length; i += batchSize) {
            const batch = nonExistingFeedbacks.slice(i, i + batchSize);
            await models.Rating.bulkCreate(
                batch.map(feedback => ({
                    transaction_id: parseInt(feedback.order_id, 10),
                    rating: parseInt(feedback.rating, 10),
                    message: feedback.review,
                    delivered: new Date(parseInt(feedback.submitted, 10) * 1000),
                })),
            );
        }
    }

    static async ekomiLink(auth: string, messageId: number) {
        const ekomiLinkResponse = await request({
            url: `${EkomiService.baseUrl}/putOrder`,
            qs: {
                auth,
                version: 'cust-1.0.0',
                order_id: messageId,
                type: 'json',
            },
            json: true,
        });
        return (ekomiLinkResponse?.body as { link: string })?.link;
    }

    static async getFeedbacks(auth: string, brandCode: BrandCode) {
        try {
            const serializedEkomiReturn = await request({
                url: `${EkomiService.baseUrl}/getFeedback`,
                qs: {
                    auth,
                    version: 'cust-1.0.0',
                    charset: 'utf-8',
                    range: '1m',
                    fields: 'date,order_id,rating,feedback',
                    type: 'json',
                },
            });
            const feedbacks = JSON.parse(serializedEkomiReturn?.body as string) as EkomiFeedback[];
            return feedbacks;
        } catch (error) {
            SentryService.captureException(error, 'ekomi', brandCode);
            return [];
        }
    }
}
