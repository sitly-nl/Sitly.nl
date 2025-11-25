import { Util, optionalAwait } from '../../utils/util';
import { MessageType } from '../../models/message.types';
import { SitlyRouter } from '../sitly-router';
import { Request, Response } from 'express';
import { BaseRoute } from '../route';
import { Error as JSONAPIError } from 'jsonapi-serializer';
import * as moment from 'moment';
import { PushNotificationService, PushNotificationDataInterface } from '../../services/push-notification.service';
import { config } from '../../../config/config';
import { PageUrlService } from '../../services/page-url.service';
import { UserWarningService } from '../../services/user-warning.service';
import { MessagesMeta, serializeMessages } from './messages.serializer';
import { ParsedQs } from 'qs';
import { forbiddenError, notFoundError, rateLimitError } from '../../services/errors';
import { getModels } from '../../sequelize-connections';
import { UserRequest } from '../../services/auth.service';
import { User } from '../../models/user/user.model';
import { Device, DeviceType } from '../../models/device.model';
import { LocaleId } from '../../models/locale.model';
import { TranslationsService } from '../../services/translations.service';
import { FetchPageInfo } from '../fetch-page-info';
import { add, isAfter, sub } from 'date-fns';
import { FeaturesService } from '../../services/features/features.service';
import { RecommendationService } from '../../services/recommendation.service';

export class MessagesRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.get<UserRequest>('/conversations/:chatPartnerUrl/messages', (req, res) => {
            return new MessagesRoute().messageList(req, res);
        });
        router.post<UserRequest>('/conversations/:chatPartnerUrl/messages/', (req, res) => {
            if (req.body.lastReadMessageId) {
                return new MessagesRoute().markAsRead(req, res);
            } else {
                return new MessagesRoute().createMessage(req, res);
            }
        });
        router.post<UserRequest>('/conversations/autorejection', (req, res) => {
            return new MessagesRoute().sendAutorejection(req, res);
        });
        router.post('/conversations/:chatPartnerUrl/notifications', (req, res) => {
            return new MessagesRoute().sendNotification(req, res);
        });

        router.delete<UserRequest>('/conversations/:chatPartnerUrl/messages/:messageId', (req, res) => {
            return new MessagesRoute().deleteMessage(req, res);
        });
    }

    async messageList(req: UserRequest, res: Response) {
        const pageSize = { min: 1, max: 20 };

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

        const validFilterKeys = ['created-before', 'created-after'];

        req.checkQuery('filter')
            .optional()
            .callback((value: string) => {
                const isInvalidFilterKey = (filterKey: string) => validFilterKeys.indexOf(filterKey) < 0;
                const invalidKeys = Object.keys(value).filter(isInvalidFilterKey);
                return typeof value === 'object' && invalidKeys.length === 0;
            })
            .withMessage({
                code: 'INVALID_KEY',
                title: `Filter must be in ${validFilterKeys.toString()}`,
            });

        req.checkQuery('filter.created-before').optional().isISO8601().withMessage({
            code: 'INVALID_FORMAT',
            title: 'Value must be a valid ISO 8601 date',
        });

        req.checkQuery('filter.created-after').optional().isISO8601().withMessage({
            code: 'INVALID_FORMAT',
            title: 'Value must be a valid ISO 8601 date',
        });

        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }

        const brandCode = req.brandCode;
        const models = getModels(brandCode);
        const showSafetyMessage = config.getConfig(brandCode).showSafetyMessage;

        const chatPartner = await models.User.byUserUrl(req.params.chatPartnerUrl, {
            includeDeleted: true,
            includeDisabled: true,
            includeInappropriate: true,
        });
        if (!chatPartner || (await req.user.hasBlockForUser(chatPartner.webuser_id))) {
            return notFoundError({ res, title: 'Conversation not found' });
        }

        let filters = req.query.filter as ParsedQs;
        if (req.user.isParent) {
            filters = {
                ...filters,
                'hide-messages-with-type': MessageType.instantJob,
            };
        }

        const fetchPageInfo = FetchPageInfo.instance(req.query.page as Record<string, string>);
        const messagesRes = fetchPageInfo
            ? await getModels(req.brandCode).Message.getMessagesAndCount(req.user.webuser_id, chatPartner.webuser_id, filters, {
                  ...req.query,
                  page: fetchPageInfo,
              })
            : await getModels(req.brandCode).Message.getMessages(req.user.webuser_id, chatPartner.webuser_id, filters, {
                  ...req.query,
              });
        const messages = 'rows' in messagesRes ? messagesRes.rows : messagesRes;

        const lastMessage = messages[0];
        if (lastMessage?.job_posting_id) {
            await lastMessage.reload({ include: 'jobPosting' });
        }

        const metaInfo: MessagesMeta = {
            paginationInfo: 'count' in messagesRes ? fetchPageInfo?.paginationInfo(messagesRes.count) : undefined,
            meta: {
                askForRecommendation: false,
                recommendationsEnabled: false,
                chatPartnerOnline: !!chatPartner.last_login && isAfter(chatPartner.last_login, sub(new Date(), { minutes: 1 })),
            },
        };

        const rateLimitExceeded = req.user.rateLimitExceeded;
        const rateLimitWarning = req.user.rateLimitWarning;
        if (
            (rateLimitExceeded || rateLimitWarning) &&
            (await models.Message.getMessagesCount(req.user.webuser_id, chatPartner.webuser_id)) === 0
        ) {
            if (rateLimitExceeded) {
                metaInfo.meta.rateLimitExceeded = rateLimitExceeded;
            } else {
                metaInfo.meta.rateLimitWarning = rateLimitWarning;
            }
        }

        // recommendations
        if (!req.user.isParent && chatPartner.availableForChat) {
            // TODO: after removal of old recommendations flow - remove this
            const recommendationsCount = await models.Recommendation.recommendationsCount(req.user.webuser_id, chatPartner.webuser_id);
            const repliesCount = messages.filter(message => {
                return message.sender_id === chatPartner?.webuser_id;
            }).length;
            metaInfo.meta.askForRecommendation =
                repliesCount > 1 &&
                moment(messages.at(-1)?.created).add(4, 'days').diff(moment()) < 0 &&
                !messages.some(message => message.message_type === MessageType.askRecommendation) &&
                recommendationsCount === 0;
        }
        const conversation = await models.Conversation.conversationForUsers(req.user.webuser_id, chatPartner.webuser_id);
        metaInfo.meta.successfulSince = conversation?.successful_at ?? undefined;
        // TODO: after conversations created for all messages - make sure conversation is always supplied
        metaInfo.meta.recommendationsEnabled =
            conversation && (await RecommendationService.recommendationEnabled(conversation, req.user, chatPartner));

        if (FeaturesService.jobPostingEnabled) {
            const jobPostingUserId = (req.user.isParent ? req.user : chatPartner).webuser_id;
            const jobPosting = await models.JobPosting.byUserId(jobPostingUserId);
            if (jobPosting) {
                const invitedUserId = (req.user.isParent ? chatPartner : req.user).webuser_id;
                const jobPostingUser = await models.JobPostingUser.byFosterIdForJobPosting(invitedUserId, jobPosting.instance_id);

                const isInvitation =
                    jobPostingUser && (messages.length === 0 || moment(jobPosting.created_at).diff(moment(messages[0].created)) >= 0);
                if (isInvitation) {
                    metaInfo.jobPosting = jobPosting;
                }
            }
        }

        // safety message
        if (showSafetyMessage) {
            const pageUrlService = new PageUrlService(req.brandCode, req.localeId, req.headers.host);
            const userType = req.user.isParent ? 'parents' : 'fosters';
            const translationCode = req.user.isParent ? 'safety.tips' : 'safety.tips-foster';
            const [contactUrl, tenStepsParentUrl, translator] = await Promise.all([
                pageUrlService.getContactUrl(),
                pageUrlService.getTenStepsUrl(userType),
                TranslationsService.translator({
                    groupName: 'messages',
                    localeId: req.localeId,
                    prefix: translationCode,
                }),
            ]);

            metaInfo.meta.safetyTips = translator.translated(
                translationCode,
                {
                    '[tenStepsURL]': tenStepsParentUrl ?? '-',
                    '[contactURL]': contactUrl ?? '-',
                },
                false,
            );

            if (!req.user.customUser?.disabled_safety_messages) {
                const safetyMessagesCount = await models.Message.safetyMessagesCount(req.user.webuser_id);
                if (safetyMessagesCount >= 3) {
                    metaInfo.meta.askDisableSafetyMessages = true;
                }
            }
        }

        metaInfo.meta.callAvailable = false;

        const serializedReturn = await serializeMessages(messages, req, req.user, metaInfo);
        res.json(serializedReturn);
    }

    async markAsRead(req: UserRequest, res: Response) {
        req.checkBody('lastReadMessageId')
            .matches(/[0-9]+/)
            .withMessage({
                code: 'INVALID_FORMAT',
                title: 'lastReadMessageId must contain a number',
            });
        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }

        const models = getModels(req.brandCode);

        const chatPartner = await models.User.byUserUrl(req.params.chatPartnerUrl, {
            includeDeleted: true,
            includeDisabled: true,
            includeInappropriate: true,
        });
        if (!chatPartner) {
            return notFoundError({ res, title: 'Conversation not found' });
        }

        try {
            await models.ConversationWrapperOld.markAsRead(
                req.user.webuser_id,
                chatPartner.webuser_id,
                req.body.lastReadMessageId as string,
            );
        } catch {}

        res.status(204).json();
    }

    async createMessage(req: UserRequest, res: Response, type: MessageType = MessageType.regular) {
        req.checkBody('content').notEmpty().withMessage({
            code: 'REQUIRED',
            title: 'Content is required',
        });

        const brandCode = req.brandCode;
        const models = getModels(brandCode);

        const chatPartner = await models.User.byUserUrl(req.params.chatPartnerUrl, {
            includeInvisible: true,
        });
        if (!chatPartner || (await req.user.hasBlockForUser(chatPartner.webuser_id))) {
            return notFoundError({ res, title: 'Conversation not found' });
        }

        let conversation = await models.Conversation.conversationForUsers(req.user.webuser_id, chatPartner.webuser_id);

        const isInitial = (await models.Message.getMessagesCount(req.user.webuser_id, chatPartner.webuser_id)) === 0;
        // TODO: after conversations created for all messages -
        // const isInitial = !!conversation;

        await req.user.customUser.reload();
        if (isInitial && !req.user.isPremium) {
            return forbiddenError({ res, title: 'A premium membership is needed to start a conversation' });
        }

        if (isInitial && chatPartner.customUser?.invisible) {
            return forbiddenError({ res, title: 'Cannot start a conversation with this user' });
        }

        const isTestUser = req.user.email && Util.isTestingEmail(req.user.email);
        const isTestChatPartner = chatPartner.email && Util.isTestingEmail(chatPartner.email);
        if (isTestUser && !isTestChatPartner) {
            return forbiddenError({ res, title: 'Cannot start a conversation with this user' });
        }

        if (await this.handleValidationResult(req, res)) {
            return;
        }

        if (isInitial && req.user.rateLimitExceeded) {
            return rateLimitError({ res, title: 'Too many initial messages sent' });
        }

        if (!conversation && isInitial) {
            // TODO: after conversations created for all messages - remove isInitial check
            conversation = await models.Conversation.create({
                user1_id: req.user.webuser_id,
                user2_id: chatPartner.webuser_id,
            });
        }

        const message = await models.Message.create({
            sender_id: req.user.webuser_id,
            sender_name: req.user.first_name,
            receiver_id: chatPartner.webuser_id,
            subject: '',
            content: (req.body.content as string).substring(0, 20000),
            created: new Date(),
            message_type: type,
            active: 0,
            is_initial: Util.boolyToInt(isInitial) as never,
            // TODO: after conversations created for all messages - conversation will be always supplied
            ...(conversation ? { conversation_id: conversation.conversation_id } : {}),
        });

        // TODO: after conversations created for all messages - conversation will be always supplied
        if (conversation && !conversation.successful_at) {
            const messages = await models.Message.findAll({
                attributes: ['sender_id'],
                where: {
                    conversation_id: conversation.conversation_id,
                },
                order: [
                    ['created', 'DESC'],
                    ['instance_id', 'DESC'],
                ],
                raw: true,
            });
            const consecutivelyUniqueSenderIds = messages.filter((item, index) => {
                return item.sender_id !== messages[index + 1]?.sender_id;
            });
            if (consecutivelyUniqueSenderIds.length >= 4) {
                await conversation.update({ successful_at: new Date() });
            }
        }

        await UserWarningService.processMessage(req.user, message);

        if (
            !req.user.customUser.disabled_safety_messages &&
            config.getConfig(brandCode).showSafetyMessage &&
            (await models.Message.getSentMessagesCount(req.user.webuser_id, chatPartner.webuser_id)) === 2
        ) {
            const translationCode = req.user.isParent ? 'safety.main' : 'safety.main-foster';
            const translator = await TranslationsService.translator({
                groupName: 'messages',
                localeId: req.user.customUser?.locale_id ?? LocaleId.en_GB,
                prefix: translationCode,
            });
            await models.Message.create({
                sender_id: req.user.webuser_id,
                sender_name: req.user.first_name,
                receiver_id: chatPartner.webuser_id,
                subject: '',
                content: translator.translated(translationCode),
                created: add(new Date(), { seconds: 1 }),
                message_type: MessageType.safetyTips,
                // TODO: after conversations created for all messages - conversation will be always supplied
                ...(conversation ? { conversation_id: conversation.conversation_id } : {}),
            });
        }

        await optionalAwait(this.sendRatingRequest(req.user, chatPartner, Util.isTestSuite(req.headers?.['user-agent'])));

        await req.user.customUser.reload();
        res.status(201);
        res.json(await serializeMessages(message, req, req.user));
    }

    private async sendAutorejection(req: UserRequest, res: Response) {
        req.checkBody('userIds')
            .isArray()
            .withMessage({
                code: 'REQUIRED',
                title: 'userIds must be an array',
            })
            .callback((value: unknown[]) => value?.every(item => typeof item === 'string'))
            .withMessage({
                code: 'REQUIRED',
                title: 'userIds must be an array of strings',
            });
        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }

        const models = getModels(req.brandCode);

        const chatPartners = await models.User.byUserUrls(req.body.userIds as string[]);
        if (chatPartners.length === 0) {
            return notFoundError({ res, title: 'Conversations not found' });
        }

        if (req.body.userIds.length === 1) {
            // for single rejection check if it is allowed
            const chatPartner = chatPartners[0];
            const messages = await models.Message.getSentMessages(req.user.webuser_id, chatPartner.webuser_id);
            if (messages.some(message => message.message_type !== MessageType.instantJob)) {
                return forbiddenError({ res, title: 'Send rejection is not allowed' });
            }
        }

        const content = `autorejection.${
            req.user.isParent ? 'parent' : req.user.customUser?.gender === 'm' ? 'babysitter.male' : 'babysitter.female'
        }`;

        // TODO: after conversations created for all messages - improve this setup - chatPartners should be removed
        const conversations = await models.Conversation.conversationsForUsers(
            req.user.webuser_id,
            chatPartners.map(item => item.webuser_id),
        );

        const messages = await models.Message.bulkCreate(
            chatPartners.map(item => {
                return {
                    sender_id: req.user.webuser_id,
                    sender_name: req.user.first_name,
                    receiver_id: item.webuser_id,
                    subject: '',
                    content,
                    created: new Date(),
                    message_type: MessageType.autoRejection,
                    conversation_id: conversations.find(
                        conversation => conversation.user1_id === req.user.webuser_id || conversation.user2_id === req.user.webuser_id,
                    )?.conversation_id,
                };
            }),
        );

        res.status(201).json(await serializeMessages(messages, req, req.user));
    }

    private async sendRatingRequest(sender: User, receiver: User, isTest = false) {
        // isTest needs to test for ios_rated = 1 in unit tests, because node can't receive notifications
        if (!sender.customUser?.ios_rated || !sender.customUser?.android_rated) {
            await sender.customUser.reload({ include: 'devices' });
            const devices = sender.customUser.devices ?? [];

            let rateIos = !sender.customUser?.ios_rated;
            let rateAndroid = !sender.customUser?.android_rated;
            const iosDevices = devices.filter(device => device.device_type === DeviceType.ios);
            const androidDevices = devices.filter(device => device.device_type === DeviceType.android);

            if (!iosDevices.length) {
                rateIos = false;
            }
            if (!androidDevices.length) {
                rateAndroid = false;
            }

            const unRepliedConversationCount = await sender.sequelize.models.ConversationWrapperOld.getUnRepliedConversationsCount(
                sender.webuser_id,
            );
            if (unRepliedConversationCount > 2) {
                return false;
            }

            const messages = await sender.sequelize.models.Message.getMessages(sender.webuser_id, receiver.webuser_id);
            const sentMessages = messages.filter(message => message.sender_id === sender.webuser_id);
            if (sentMessages.length < 4) {
                return false;
            }

            if (devices.length) {
                await Util.wait(isTest ? 100 : 5000);

                let devices: Device[] = [];
                if (rateIos) {
                    devices = [...iosDevices];
                }
                if (rateAndroid) {
                    devices = [...devices, ...androidDevices];
                }

                if (devices.length) {
                    const notification: PushNotificationDataInterface = {
                        data: {
                            type: 'rating_reminder',
                        },
                    };
                    const updateUser = async () => {
                        if (rateIos) {
                            await sender.customUser.update({
                                ios_rated: 1,
                            });
                        }

                        if (rateAndroid) {
                            await sender.customUser.update({
                                android_rated: 1,
                            });
                        }
                    };

                    if (isTest) {
                        await updateUser();
                    }

                    const results = await PushNotificationService.sendToDevices(notification, devices);
                    if (results.length) {
                        if (rateIos) {
                            sender.customUser.update({
                                ios_rated: 1,
                            });
                        }

                        if (rateAndroid) {
                            sender.customUser.update({
                                android_rated: 1,
                            });
                        }
                    }
                }
            }
        }
    }

    private async sendNotification(req: Request, res: Response) {
        const models = getModels(req.brandCode);

        req.checkBody('messageId').notEmpty().withMessage({
            code: 'REQUIRED',
            title: 'messageId is required',
        });

        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }
        const message = await models.Message.findByPk((req.body.messageId as number) ?? 0);

        let found = false;
        if (message) {
            const receiver = await models.User.findByPk(message.receiver_id ?? 0, { include: 'customUser' });
            if (!receiver) {
                return notFoundError({ res, title: `receiver not found in message - ${message.instance_id}` });
            }
            const receiverUrl = receiver?.customUser.webuser_url;
            if (req.params.chatPartnerUrl === receiverUrl) {
                found = true;
                const sender = await models.User.findByPk(message.sender_id ?? 0, { include: 'customUser' });
                if (!sender) {
                    return notFoundError({ res, title: `sender not found in message - ${message.instance_id}` });
                }
                try {
                    const results = await PushNotificationService.sendChatMessages([{ message, receiver, sender }]);
                    if (results[0]?.some(item => 'name' in item)) {
                        message.update({
                            notified: 1,
                        });
                    }
                } catch (e) {
                    return this.serverError(req, res, e as Error);
                }
            }
        }
        if (!found) {
            res.status(404);
            const error = JSONAPIError({
                code: 'NOT_FOUND',
                title: 'Message not found in conversation',
                source: {
                    parameter: 'messageId',
                },
            });
            res.json(error);
        } else {
            res.status(204).json();
        }
    }

    async deleteMessage(req: UserRequest, res: Response) {
        const models = getModels(req.brandCode);

        const message = await models.Message.byId(parseInt(req.params.messageId, 10));
        if (!message) {
            return notFoundError({ res, title: 'Message not found' });
        }

        const chatPartner = await models.User.byUserUrl(req.params.chatPartnerUrl);
        if (!chatPartner) {
            return notFoundError({ res, title: 'Conversation not found' });
        }

        const messageUserIds = [message.sender_id, message.receiver_id].filter(item => item !== null).sort((a, b) => a - b);
        const conversationUserIds = [req.user.webuser_id, chatPartner.webuser_id].sort((a, b) => a - b);
        if (messageUserIds.toString() !== conversationUserIds.toString()) {
            return forbiddenError({ res });
        }

        if (message.sender_id === req.user.webuser_id) {
            message.sender_deleted = 1;
        } else {
            message.receiver_deleted = 1;
        }
        await message.save();

        res.status(204).json();
    }
}
