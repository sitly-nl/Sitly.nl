import { MessagesRoute } from './messages/messages';
import { BaseRoute } from './route';
import { Request, Response } from 'express';
import { RecommendationTokenData, SitlyToken, TokenObject } from '../sitly-token';
import { MessageType } from '../models/message.types';
import { serializeUser } from './users/user.serializer';
import { SitlyRouter } from './sitly-router';
import { CommonEmailsService } from '../services/email/common-emails.service';
import { MysqlError } from 'mysql';
import { forbiddenError, notFoundError, serverError, unprocessableEntityError } from '../services/errors';
import { getModels } from '../sequelize-connections';
import { UserRequest } from '../services/auth.service';
import { LinksService } from '../services/links.service';
import { ForeignKeyConstraintError } from 'sequelize';

export class RecommendationsOldRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.post<UserRequest>('/users/me/recommendations/links', (req, res) => {
            return new RecommendationsOldRoute().createLink(req, res);
        });

        router.post<UserRequest>('/users/me/recommendations/email', (req, res) => {
            return new RecommendationsOldRoute().sendEmail(req, res);
        });

        router.post('/users/:userId/recommendations', (req, res) => {
            return new RecommendationsOldRoute().createRecommendation(req, res);
        });

        router.get<UserRequest>('/users/me/recommendations/suggested-users', (req, res) => {
            return new RecommendationsOldRoute().getSuggestedUsers(req, res);
        });

        router.post<UserRequest>('/recommendations/:chatPartnerUrl/requests', (req, res) => {
            return new RecommendationsOldRoute().askRecommendation(req, res);
        });
    }

    private async createRecommendation(req: Request, res: Response) {
        const descriptionLength = {
            min: 30,
            max: 1000,
        };

        req.checkBody('description')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'description is required',
            })
            .isLength(descriptionLength)
            .withMessage({
                code: 'INVALID_LENGTH',
                title: `description must be between ${descriptionLength.min} and ${descriptionLength.max} characters long`,
            });

        const scoreRange = { min: 1, max: 5 };

        req.checkBody('score')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'score is required',
            })
            .isInt(scoreRange)
            .withMessage({
                code: 'INVALID_VALUE',
                title: `score must be an integer between ${scoreRange.min} and ${scoreRange.max}`,
            });

        const sitlyToken = new SitlyToken();
        let tokenData: TokenObject<RecommendationTokenData> | undefined;
        req.checkBody('token')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'token is required',
            })
            .callback((value: string) => {
                tokenData = sitlyToken.read(value);
                if (!tokenData?.data?.fosterId || !tokenData?.data?.parentFirstName) {
                    return false;
                }
                return !!tokenData;
            })
            .withMessage({
                code: 'INVALID_VALUE',
                title: 'token is invalid',
            });
        if ((await this.handleValidationResult(req, res)) || !tokenData) {
            return;
        }

        try {
            await getModels(req.brandCode).Recommendation.create({
                webuser_id: tokenData.data.fosterId,
                author_id: tokenData.data.authorId,
                description: req.body.description as string,
                score: req.body.score as number,
                author_name: tokenData.data.parentFirstName,
                token_id: tokenData.jti,
            });
        } catch (error) {
            if ((error as MysqlError).name === 'SequelizeUniqueConstraintError') {
                return forbiddenError({ res, title: 'Token can be used only once' });
            } else if (error instanceof ForeignKeyConstraintError) {
                return notFoundError({ res, title: 'User is not found' });
            } else {
                return serverError(req, res, error as Error);
            }
        }

        res.status(204).json();
    }

    private async sendEmail(req: UserRequest, res: Response) {
        req.checkBody('email')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'e-mail is required',
            })
            .isEmail()
            .withMessage({
                code: 'INVALID_FORMAT',
                title: 'Invalid e-mail address',
            });

        req.checkBody('recipientName').notEmpty().withMessage({
            code: 'REQUIRED',
            title: 'recipientName is required',
        });

        req.checkBody('message').notEmpty().withMessage({
            code: 'REQUIRED',
            title: 'message is required',
        });

        req.checkBody('link').notEmpty().withMessage({
            code: 'REQUIRED',
            title: 'link is required',
        });

        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }

        CommonEmailsService.sendRecommendation(
            req.user,
            req.body.email as string,
            req.body.recipientName as string,
            req.body.message as string,
            req.body.link as string,
        );

        res.status(204);
        res.json();
    }

    private async createLink(req: UserRequest, res: Response) {
        req.checkBody('firstName').notEmpty().withMessage({
            code: 'REQUIRED',
            title: 'First name is required',
        });
        if (await this.handleValidationResult(req, res)) {
            return;
        }

        let author;
        if (req.body.authorId) {
            author = await getModels(req.brandCode).User.byUserUrl(req.body.authorId as string, {
                includeDisabled: true,
            });
            if (!author) {
                return unprocessableEntityError({
                    res,
                    code: 'NOT_FOUND',
                    title: 'Author not found',
                    source: {
                        parameter: 'authorId',
                    },
                });
            }
        }

        const firstName = req.body.firstName as string;
        const token = SitlyToken.recommendationToken(req.user, firstName, author);
        const recommendationUrl = await LinksService.postRecommendationUrl(req.user, firstName, token);
        res.status(201).json({ links: { recommendationUrl } });
    }

    private async getSuggestedUsers(req: UserRequest, res: Response) {
        const messagesUsersIds = await getModels(req.brandCode).Message.getReceiverIdsBySenderId(req.user.webuser_id);

        let includes;
        try {
            includes = this.getIncludes(req, ['children']);
        } catch (error) {
            return this.handleError(req, res, error);
        }

        const users = await getModels(req.brandCode).User.byIds(messagesUsersIds, includes);
        const serializedUsers = await serializeUser({ data: users, contextUser: req.user, localeCode: req.locale });
        res.status(200).json(serializedUsers);
    }

    private askRecommendation(req: UserRequest, res: Response) {
        return new MessagesRoute().createMessage(req, res, MessageType.askRecommendation);
    }
}
