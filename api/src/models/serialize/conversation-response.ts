import { ConversationWrapperOld } from '../conversation-old.model';
import { MessageType } from '../message.types';
import { User } from '../user/user.model';
import { MessageResponse } from './message-response';
import { UserResponse } from './user-response';

export enum ConversationState {
    default = 'default',
    jobPostingInvitation = 'jobPostingInvitation',
}

export class ConversationResponse {
    static keys: (keyof ConversationResponse)[] = [
        'id',
        'totalMessagesCount',
        'unreadMessagesCount',
        'unanswered',
        'chatPartner',
        'state',
        'lastMessage',
    ];

    id = this.useInternalData ? this.conversation.chatPartner.webuser_id : this.conversation.chatPartner.customUser.webuser_url;
    totalMessagesCount = this.conversation.total_messages_count;
    unreadMessagesCount = this.conversation.unread_messages_count;
    unanswered: number | undefined;
    sentMessagesCount = this.conversation.sent_messages_count;
    currentUserStarted = this.conversation.current_user_started;
    state: ConversationState; // from job-posting
    requestingUserIsParent = false;

    chatPartner?: UserResponse;
    lastMessage?: MessageResponse; // optional only for job posting

    get autoRejectableUser() {
        const chatPartner = this.conversation.chatPartner;
        if (
            this.sentMessagesCount === 0 &&
            this.conversation.lastMessage?.message_type !== MessageType.instantJob &&
            !chatPartner.customUser.disabled
        ) {
            return {
                userId: chatPartner.customUser.webuser_url,
                firstName: chatPartner.first_name,
            };
        }
        return undefined;
    }
    get chatPartnerAvailableForChat() {
        return this.conversation.chatPartner.availableForChat;
    }

    private constructor(
        private conversation: ConversationWrapperOld,
        private useInternalData: boolean,
    ) {}

    static async instance(conversation: ConversationWrapperOld, user: User, includes: string[], useInternalData: boolean) {
        const ret = new ConversationResponse(conversation, useInternalData);
        ret.requestingUserIsParent = user.isParent;

        const promises: Promise<unknown>[] = [];
        if (includes.includes('chat-partner') && conversation.chatPartner) {
            promises.push(
                (async () => {
                    ret.chatPartner = await UserResponse.instance(conversation.chatPartner, {
                        type: useInternalData ? 'internal.base' : 'regular.base',
                        user,
                    });
                })(),
            );
        }
        if (conversation.lastMessage) {
            const message = conversation.lastMessage;
            promises.push(
                (async () => {
                    ret.lastMessage = await MessageResponse.instance(message, user);
                })(),
            );
        }
        await Promise.all(promises);

        return ret;
    }
}
