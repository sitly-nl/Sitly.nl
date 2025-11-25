import { Serializer as JSONAPISerializer } from 'jsonapi-serializer';
import { NotificationSettings } from '../user/notification-settings.model';

class NotificationPreferencesResponse {
    static keys: (keyof NotificationPreferencesResponse)[] = ['id', 'emailMatches', 'emailConnectionInvites'];

    id = this.model.webuser_id;
    emailMatches = this.model.email_matches;
    emailConnectionInvites = this.model.email_connection_invites;

    private constructor(private model: NotificationSettings) {}

    static instance(model: NotificationSettings) {
        return new NotificationPreferencesResponse(model);
    }
}

export const serialize = (model: NotificationSettings) => {
    const serializer = new JSONAPISerializer('notification-preferences', {
        attributes: NotificationPreferencesResponse.keys,
        keyForAttribute: 'camelCase',
    });
    return serializer.serialize(NotificationPreferencesResponse.instance(model));
};
