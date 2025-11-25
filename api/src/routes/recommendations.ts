import { Response } from 'express';
import { OptionalUserRequest, UserRequest } from '../services/auth.service';
import { forbiddenError, notFoundError } from '../services/errors';
import { BaseRoute } from './route';
import { SitlyRouter } from './sitly-router';
import { z } from 'zod';
import { RecommendationStatus } from '../models/recommendation.model';
import { RecommendationService } from '../services/recommendation.service';
import { getModels } from '../sequelize-connections';
import { serializeExternal } from '../models/serialize/recommendation-response';

export class RecommendationsRoute extends BaseRoute {
    private scoreSchema = z.number().int().min(1).max(5);
    private descriptionSchema = z.string().min(30).max(1000);

    static create(router: SitlyRouter) {
        router.get<OptionalUserRequest>('/recommendations/:encryptedRecommendationId', (req, res) => {
            return new RecommendationsRoute().recommendationByEncryptedId(req, res);
        });
        router.post<UserRequest>('/recommendations', (req, res) => {
            return new RecommendationsRoute().create(req, res);
        });
        router.patch<UserRequest>('/recommendations/:encryptedRecommendationId', (req, res) => {
            return new RecommendationsRoute().update(req, res);
        });
    }

    async recommendationByEncryptedId(req: OptionalUserRequest, res: Response) {
        try {
            const includes = this.getIncludes(req, ['user']);

            const recommendation = await getModels(req.brandCode).Recommendation.byEncryptedRecommendationId(
                req.params.encryptedRecommendationId,
                { author_id: req.user?.webuser_id ?? null },
                includes.includes('user'),
            );
            if (!recommendation) {
                return notFoundError({ res, title: 'Recommendation is not found' });
            }
            res.json(await serializeExternal(recommendation));
        } catch (error) {
            this.handleError(req, res, error);
        }
    }

    async create(req: UserRequest, res: Response) {
        try {
            const models = req.user.sequelize.models;

            const inputSchema = z.union([
                z.object({ authorId: z.string().min(1) }).strict(),
                z.object({ authorName: z.string().min(1).max(50) }).strict(),
                z.object({
                    score: this.scoreSchema,
                    description: this.descriptionSchema,
                    userId: z.string().min(1),
                }),
            ]);
            const input = inputSchema.parse(req.body);

            if ('score' in input) {
                // Recommendation without request
                const receiver = await models.User.byUserUrl(input.userId);
                if (!receiver) {
                    return notFoundError({ res, title: 'Receiver is not found' });
                }
                if (receiver.isParent) {
                    return forbiddenError({ res, title: 'Recommendation can be created only for fosters' });
                }

                if ((await models.Recommendation.recommendationsCount(receiver.webuser_id, req.user.webuser_id)) > 0) {
                    return forbiddenError({ res, title: 'Recommendation already exists' });
                }

                await models.Recommendation.create({
                    webuser_id: receiver.webuser_id,
                    author_id: req.user.webuser_id,
                    author_name: req.user.first_name ?? '',
                    score: input.score,
                    description: input.description,
                    recommendation_status: RecommendationStatus.published,
                });
            } else {
                // Requested recommendation
                let authorId;
                let authorName;
                if ('authorId' in input) {
                    const author = await models.User.byUserUrl(input.authorId);
                    if (!author) {
                        return notFoundError({ res, title: 'Author is not found' });
                    }
                    authorId = author.webuser_id;
                    authorName = author.first_name ?? '';

                    const conversation = await models.Conversation.conversationForUsers(req.user.webuser_id, authorId);
                    if (!conversation || !(await RecommendationService.recommendationEnabled(conversation, req.user, author))) {
                        return forbiddenError({ res, title: 'Proper conversation is required to create a recommendation' });
                    }

                    if ((await models.Recommendation.recommendationsCount(req.user.webuser_id, authorId)) > 0) {
                        return forbiddenError({ res, title: 'Recommendation already exists' });
                    }
                } else {
                    authorName = input.authorName;
                }

                if (req.user.isParent) {
                    return forbiddenError({ res, title: 'Recommendation can be created only for fosters' });
                }

                await models.Recommendation.create({
                    webuser_id: req.user.webuser_id,
                    author_id: authorId,
                    author_name: authorName,
                });
            }

            res.status(201).json();
        } catch (error) {
            this.handleError(req, res, error);
        }
    }

    async update(req: UserRequest, res: Response) {
        try {
            const input = z
                .object({
                    score: this.scoreSchema,
                    description: this.descriptionSchema,
                })
                .parse(req.body);

            const recommendation = await req.user.sequelize.models.Recommendation.byEncryptedRecommendationId(
                req.params.encryptedRecommendationId,
            );
            if (!recommendation) {
                return notFoundError({ res, title: 'Recommendation is not found' });
            }
            if (recommendation.author_id !== req.user.webuser_id) {
                return forbiddenError({ res, title: 'Recommendation can be updated only by author' });
            }
            if (recommendation.recommendation_status === RecommendationStatus.published) {
                return forbiddenError({ res, title: 'Recommendation can be updated only if it is not published' });
            }

            await recommendation.update({
                recommendation_status: RecommendationStatus.published,
                score: input.score,
                description: input.description,
            });
            res.json();
        } catch (error) {
            this.handleError(req, res, error);
        }
    }
}
