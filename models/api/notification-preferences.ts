import { BaseApiModel } from 'app/models/api/response';

export type EmailFrequency = 'weekly' | 'daily' | 'never';

export class NotificationPreferences extends BaseApiModel {
    emailConnectionInvites: EmailFrequency;
    emailMatches: EmailFrequency;
}
