import { MessageType } from '../models/message.types';
import { BrandCode } from '../models/brand-code';
import { config } from '../../config/config';
import { UserSearchElastic, UserSearchParams } from '../search/user-search-elastic';
import { ScoringOptions } from '../search/relevance-sorting/relevance-scoring-options';
import { CustomUser, MatchmailSetting } from '../models/user/custom-user.model';
import { differenceInMilliseconds, formatISO, getUnixTime, sub } from 'date-fns';
import { getModels } from '../sequelize-connections';
import { Op } from 'sequelize';
import { InstantJobNotificationsEmailService } from './email/instant-job-notifications-email.service';
import { PushNotificationService } from './push-notification.service';
import { SentryService } from './sentry.service';
import { User, WebRoleId } from '../models/user/user.model';
import { Environment } from './env-settings.service';
import { TranslationsService } from './translations.service';

export class InstantJobService {
    async runCycle(brandCode: BrandCode) {
        const brandConfigSettings = config.getConfig(brandCode);
        const localeId = brandConfigSettings.defaultLocaleId;

        const translation = await TranslationsService.singleTranslation({
            localeId,
            groupName: 'messages',
            code: 'instantJob.message',
        });

        const userSearch = new UserSearchElastic(brandCode, localeId);

        const models = getModels(brandCode);

        // fetch new parents
        const newParents = await models.User.findAll({
            where: [
                {
                    webrole_id: WebRoleId.parent,
                    created: {
                        [Op.between]: [getUnixTime(sub(new Date(), { hours: 3, minutes: 10 })), getUnixTime(sub(new Date(), { hours: 3 }))],
                    },
                },
                { [Op.not]: { email: { [Op.endsWith]: '@sitly.com' } } },
            ],
            include: {
                association: 'customUser',
                where: CustomUser.defaultWhere,
                include: CustomUser.includes(['children']),
            },
        });

        // should handle each parent consequentially, overwise max messages count check can fail
        for (const parent of newParents) {
            const scoringOptions = new ScoringOptions(
                true,
                {
                    center: {
                        latitude: parent.customUser.map_latitude ?? 0,
                        longitude: parent.customUser.map_longitude ?? 0,
                    },
                    maxDistance: parent.customUser.pref_max_distance,
                },
                undefined,
            );
            scoringOptions.children = parent.customUser.children ?? [];

            const params: UserSearchParams = {
                type: 'babysitters',
                limit: 50,
                scoring_options: scoringOptions,
                created_after: formatISO(sub(new Date(), { hours: 24 })),
                foster_is_premium: false,
            };

            // send to not premium babysitters, which signed up in last 24 hours
            const notPremiumFosters = await userSearch.users(params, {});
            const nonPremiumMessages = await this.createChatMessages(notPremiumFosters.models, parent, translation, false);

            // send to premium babysitters with last search activity >= 3 days
            const paramsPremium = {
                ...params,
                foster_is_premium: true,
                last_search_activity_after: formatISO(sub(new Date(), { days: 3 })),
            };
            delete paramsPremium.created_after;
            const premiumFosters = await userSearch.users(paramsPremium, {});
            const premiumMessages = await this.createChatMessages(premiumFosters.models, parent, translation, true);

            if (Environment.isApiTests) {
                continue;
            }

            const nonPremiumMessagesUserIds = nonPremiumMessages.map(message => message?.receiver_id);
            const premiumMessagesUserIds = premiumMessages.map(message => message?.receiver_id);
            const fosters = [
                ...notPremiumFosters.models.filter(user => nonPremiumMessagesUserIds.includes(user.webuser_id)),
                ...premiumFosters.models.filter(user => premiumMessagesUserIds.includes(user.webuser_id)),
            ];

            if (parent && fosters.length > 0) {
                try {
                    const messages = [...nonPremiumMessages, ...premiumMessages].filter(message => message !== undefined);

                    await InstantJobNotificationsEmailService.sendBulkInstantJobEmailNotification(parent, fosters);

                    await PushNotificationService.sendChatMessages(
                        messages
                            .map(message => {
                                const receiver = fosters.find(foster => foster.webuser_id === message.receiver_id);
                                if (receiver) {
                                    return { message, receiver, sender: parent };
                                } else {
                                    return undefined;
                                }
                            })
                            .filter(item => item !== undefined),
                    );
                } catch (error) {
                    SentryService.captureException(error, 'cron.instant-job.send-notification', brandCode);
                }
            }
        }
    }

    private async createChatMessages(fosters: User[], parent: User, messageContent: string, forPremium: boolean) {
        const models = parent.sequelize.models;

        const bulk = await Promise.all(
            fosters
                .filter(user => user.customUser.automatch_mail !== MatchmailSetting.never)
                .map(async foster => {
                    let maxMessagesCount = 5;
                    if (!forPremium && foster.created) {
                        if (differenceInMilliseconds(foster.created, sub(new Date(), { hours: 3 })) > 0) {
                            maxMessagesCount = 2;
                        } else if (
                            differenceInMilliseconds(foster.created, sub(new Date(), { hours: 3 })) < 0 &&
                            differenceInMilliseconds(foster.created, sub(new Date(), { hours: 6 })) >= 0
                        ) {
                            maxMessagesCount = 3;
                        } else if (
                            differenceInMilliseconds(foster.created, sub(new Date(), { hours: 6 })) < 0 &&
                            differenceInMilliseconds(foster.created, sub(new Date(), { hours: 12 })) >= 0
                        ) {
                            maxMessagesCount = 4;
                        }
                    }

                    const count = await models.Message.getReceivedMessagesCount(foster.webuser_id, MessageType.instantJob);
                    if (count < maxMessagesCount) {
                        // TODO: after conversations created for all messages - replace with Conversation.findOrCreateForUsers
                        const hasConversation = (await models.Message.getMessagesCount(parent.webuser_id, foster.webuser_id)) > 0;
                        if (!hasConversation) {
                            const conversation = await models.Conversation.create({
                                user1_id: parent.webuser_id,
                                user2_id: foster.webuser_id,
                            });
                            return {
                                sender_id: parent.webuser_id,
                                sender_name: parent.first_name,
                                receiver_id: foster.webuser_id,
                                content: messageContent,
                                created: new Date(),
                                message_type: MessageType.instantJob,
                                is_initial: 1 as const,
                                conversation_id: conversation.conversation_id,
                            };
                        }
                    }
                }),
        );
        return models.Message.bulkCreate(bulk.filter(item => item !== undefined));
    }
}
