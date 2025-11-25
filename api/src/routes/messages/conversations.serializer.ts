import { LinkFunction, Serializer as JSONAPISerializer } from 'jsonapi-serializer';
import { Environment } from '../../services/env-settings.service';
import { includedUserOptions } from '../users/user.serializer';
import { ConversationResponse } from '../../models/serialize/conversation-response';
import { MessageResponse } from '../../models/serialize/message-response';
import { isBefore, sub } from 'date-fns';

export const serializeConversations = (
    data: ConversationResponse[],
    metaInfo: {
        meta?: Record<string, unknown>;
        links?: Record<string, string | LinkFunction>;
    },
) => {
    const serializer = new JSONAPISerializer('conversations', {
        attributes: ConversationResponse.keys,
        typeForAttribute: (str, _attrVal) => {
            const map: Record<string, string> = {
                chatPartner: 'users',
                lastMessage: 'messages',
            };
            return map[str] ? map[str] : str;
        },
        keyForAttribute: 'camelCase',
        chatPartner: includedUserOptions({}),
        lastMessage: {
            ref: 'id',
            attributes: MessageResponse.keys,
            dataMeta: {
                action: (_conversation: ConversationResponse, lastMessage: MessageResponse) => {
                    return lastMessage?.action;
                },
            },
        },
        meta: Object.assign(metaInfo?.meta ?? {}, {
            totalUnreadMessagesCount: (conversations: ConversationResponse[]) => {
                return conversations.reduce((acc, current) => (acc += current.unreadMessagesCount), 0);
            },
            autoRejectableUsers: (conversations: ConversationResponse[]) => {
                if (Environment.isProd) {
                    return [];
                } else {
                    return conversations.map(item => item.autoRejectableUser).filter(item => item);
                }
            },
            responseRate: (conversations: ConversationResponse[]) => {
                return conversations.reduce(
                    (acc, current) => {
                        const userDisabled = !current.chatPartnerAvailableForChat;
                        if (
                            current.sentMessagesCount === 0 &&
                            !userDisabled &&
                            current.lastMessage?.created &&
                            isBefore(new Date(current.lastMessage.created), sub(new Date(), { hours: 24 }))
                        ) {
                            current.unanswered = 1;
                            acc.unansweredCount += 1;
                        }
                        acc.receivedCount += current.currentUserStarted > 0 || userDisabled ? 0 : 1;
                        return acc;
                    },
                    { unansweredCount: 0, receivedCount: 0 },
                );
            },
            noRepliesReceived: (conversations: ConversationResponse[]) => {
                if (conversations[0]?.requestingUserIsParent) {
                    return false;
                }
                const withoutResponse = conversations.filter(
                    item => item.currentUserStarted && item.totalMessagesCount === item.sentMessagesCount,
                );
                if (withoutResponse.length === 0 || withoutResponse.length !== conversations.length) {
                    return false;
                }
                return withoutResponse.some(
                    item => item.lastMessage?.created && isBefore(new Date(item.lastMessage.created), sub(new Date(), { hours: 62 })),
                );
            },
        }),
        topLevelLinks: metaInfo.links ?? {},
    });

    return serializer.serialize(data);
};
