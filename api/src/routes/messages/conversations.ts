import { MessageType } from '../../models/message.types';
import { SitlyRouter } from '../sitly-router';
import { Response } from 'express';
import { BaseRoute } from '../route';
import * as moment from 'moment';
import { serializeConversations } from './conversations.serializer';
import { ParsedQs } from 'qs';
import { UrlUtil } from '../../utils/url-util';
import { ConversationResponse, ConversationState } from '../../models/serialize/conversation-response';
import { getModels } from '../../sequelize-connections';
import { UserRequest } from '../../services/auth.service';
import { notFoundError } from '../../services/errors';
import { FetchPageInfo } from '../fetch-page-info';
import { FeaturesService } from '../../services/features/features.service';

export class ConversationsRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.get<UserRequest>('/conversations', (req, res) => {
            return new ConversationsRoute().index(req, res);
        });
        router.delete<UserRequest>('/conversations/:chatPartnerUrl', (req, res) => {
            return new ConversationsRoute().deleteConversation(req, res);
        });
    }

    async index(req: UserRequest, res: Response) {
        if (req.query.page) {
            const pageSize = { min: 1, max: 1000 };
            const validPageKeys = ['number', 'size'];
            req.checkQuery('page')
                .optional()
                .callback((value: string) => {
                    const isInvalidPageKey = (pageKey: string) => validPageKeys.indexOf(pageKey) < 0;
                    return typeof value === 'object' && Object.keys(value).filter(isInvalidPageKey).length === 0;
                })
                .withMessage({
                    code: 'INVALID_KEY',
                    title: 'Page can only contain number and size as keys',
                });

            req.checkQuery('page.size')
                .optional()
                .isInt(pageSize)
                .withMessage({
                    code: 'INVALID_VALUE',
                    title: `page size must be a number between ${pageSize.min} and ${pageSize.max}`,
                });

            req.checkQuery('page.number').optional().isInt().withMessage({
                code: 'INVALID_VALUE',
                title: 'Page number must be a number',
            });
        }

        req.checkQuery('filter')
            .optional()
            .callback((value: string) => {
                const filterKeys = Object.keys(value);
                for (const filterKey of filterKeys) {
                    if (!['message-type'].includes(filterKey)) {
                        return false;
                    }
                }
                return true;
            })
            .withMessage({
                code: 'INVALID_VALUE',
                title: 'Filter can only contain message-type',
            });

        const allowedMessageTypes = Object.values(MessageType);
        req.checkQuery('filter.message-type')
            .optional()
            .callback((value: string[]) => {
                return Array.isArray(value) && value.every(item => allowedMessageTypes.includes(item as MessageType));
            })
            .withMessage({
                code: 'INVALID_VALUE',
                title: `Message type filter must be in ${allowedMessageTypes}`,
            });

        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }

        const messageTypeFilter = (req.query.filter as ParsedQs)?.['message-type'] as MessageType[];
        const models = getModels(req.brandCode);

        if (+(req.query['meta-only'] ?? 0) === 1) {
            const totalUnreadMessagesCount = await models.Message.getTotalUnreadMessagesCount(req.user.webuser_id, messageTypeFilter);
            res.json({ meta: { totalUnreadMessagesCount } });
        } else {
            let conversationsList;
            let conversationsRes;
            const fetchPageInfo = FetchPageInfo.instance(req.query.page as Record<string, string>);
            if (fetchPageInfo) {
                conversationsRes = await models.ConversationWrapperOld.getConversationsAndCount(
                    req.user.webuser_id,
                    { page: fetchPageInfo },
                    messageTypeFilter,
                );
                conversationsList = conversationsRes.rows;
            } else {
                conversationsList = await models.ConversationWrapperOld.getConversations(req.user.webuser_id, {}, messageTypeFilter);
            }

            const isParent = req.user.isParent;
            const includes = this.getIncludes(req, ['chat-partner']);
            const conversations = conversationsList.filter(item => {
                return !isParent || item.lastMessage?.message_type !== MessageType.instantJob;
            });
            const conversationsArray = await Promise.all(
                conversations.map(conversation => ConversationResponse.instance(conversation, req.user, includes, false)),
            );

            conversationsArray.sort((a, b) => {
                if (!a.lastMessage?.created || !b.lastMessage?.created) {
                    return 0;
                }
                return a.lastMessage?.created < b.lastMessage?.created ? 1 : -1;
            });

            let jobPostingConversations: ConversationResponse[] = [];
            if (FeaturesService.jobPostingEnabled) {
                let jobPostingCollection;
                if (isParent) {
                    jobPostingCollection = await models.JobPostingUser.byParentId(req.user.webuser_id, { include: 'foster' });
                } else {
                    jobPostingCollection = await models.JobPostingUser.byFosterId(req.user.webuser_id, { include: 'parent' });
                }
                const jobPostingsArray = await Promise.all(jobPostingCollection.map(jobPosting => jobPosting.serializeModel(req.user)));
                jobPostingConversations = jobPostingsArray.map(jobPostingUser => {
                    const existingConversationIndex = conversationsArray.findIndex(
                        conversation => conversation.id === (isParent ? jobPostingUser.foster_id : jobPostingUser.parent_id),
                    );
                    let existingConversation;
                    if (existingConversationIndex > -1) {
                        [existingConversation] = conversationsArray.splice(existingConversationIndex, 1);
                    }

                    let state = ConversationState.default;
                    if (
                        !existingConversation ||
                        moment(existingConversation.lastMessage?.created).diff(moment(jobPostingUser.jobPosting.created_at)) <= 0
                    ) {
                        state = ConversationState.jobPostingInvitation;
                    }

                    const chatPartner = isParent ? jobPostingUser.foster : jobPostingUser.parent;
                    return {
                        id: chatPartner.id,
                        chatPartner,
                        unreadMessageCount: 0,
                        state,
                        lastMessage: existingConversation?.lastMessage,
                    } as never;
                });
            }

            const paginationInfo = conversationsRes && fetchPageInfo?.paginationInfo(conversationsRes.count);
            res.json(
                serializeConversations([...jobPostingConversations, ...conversationsArray], {
                    links: paginationInfo && UrlUtil.createPaginationUrls(req, paginationInfo.page, paginationInfo.pageCount),
                    meta: conversationsRes && fetchPageInfo?.responseMeta(conversationsRes.count),
                }),
            );
        }
    }

    async deleteConversation(req: UserRequest, res: Response) {
        const models = getModels(req.brandCode);

        const chatPartner = await models.User.byUserUrl(req.params.chatPartnerUrl, {
            includeDeleted: true,
            includeDisabled: true,
            includeInappropriate: true,
        });
        if (!chatPartner) {
            return notFoundError({ res, title: 'Conversation not found' });
        }

        await models.ConversationWrapperOld.delete(req.user.webuser_id, chatPartner.webuser_id);

        res.status(204).json();
    }
}
