import { BaseApiModel } from 'app/models/api/response';
import { User } from 'app/models/api/user';
import { Message } from 'app/models/api/message';

export class Conversation extends BaseApiModel {
    unreadMessagesCount: number;
    unanswered?: number;
    chatPartner?: User;
    lastMessage?: Message; // should be optional until we remove job posting functionality

    // TODO: discuss this
    removingStart?: boolean;
    removing?: boolean;
}
