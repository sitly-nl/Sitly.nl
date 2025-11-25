import { BaseApiModel } from 'app/models/api/response';
import { Prompt } from 'app/models/api/prompt';

export class UserUpdates extends BaseApiModel {
    isPremium?: boolean;
    totalUnreadMessagesCount?: number;
    unviewedInvitesCount?: number;
    prompt?: Prompt;
}
