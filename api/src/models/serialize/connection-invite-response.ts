import { Serializer as JSONAPISerializer } from 'jsonapi-serializer';
import { ConnectionInvite } from '../connection-invite.model';
import { UserAttributesContext, UserResponse } from './user-response';
import { RecommendationResponse } from './recommendation-response';
import { ChildResponse } from './child-response';
import { User } from '../user/user.model';
import { includedUserOptions } from '../../routes/users/user.serializer';

export class ConnectionInviteResponse {
    static keys: (keyof ConnectionInviteResponse)[] = ['id', 'viewed', 'contactUser'];

    id = this.invite.connection_invite_id;
    viewed = !!this.invite.viewed_at;
    contactUser?: UserResponse;

    private constructor(private invite: ConnectionInvite) {}

    static async instance(invite: ConnectionInvite, contactUserContext: UserAttributesContext, contactUser?: 'receiver' | 'sender') {
        const ret = new ConnectionInviteResponse(invite);
        if (contactUser) {
            const user = contactUser === 'receiver' ? invite.receiver : invite.sender;
            ret.contactUser = user ? await UserResponse.instance(user, contactUserContext) : undefined;
        }
        return ret;
    }
}

export const serialize = async ({
    model,
    contextUser,
    localeCode,
    contactUser,
    meta,
}: {
    model: ConnectionInvite | ConnectionInvite[];
    contextUser: User;
    localeCode: string;
    contactUser?: 'receiver' | 'sender';
    meta?: { totalCount: number; totalPages: number };
}) => {
    const serializer = new JSONAPISerializer('connection-invite', {
        attributes: ConnectionInviteResponse.keys,
        keyForAttribute: 'camelCase',
        typeForAttribute: (attr: string) => (attr === 'contactUser' ? 'users' : attr),
        contactUser: includedUserOptions({
            children: {
                ref: 'id',
                attributes: ChildResponse.publicKeys,
            },
            recommendations: {
                ref: 'id',
                attributes: RecommendationResponse.keys,
            },
        }),
        ...(meta ? { meta } : {}),
    });
    const contactUserContext = { type: 'regular.base', user: contextUser, localeCode } as const;
    return serializer.serialize(
        await (Array.isArray(model)
            ? Promise.all(model.map(item => ConnectionInviteResponse.instance(item, contactUserContext, contactUser)))
            : ConnectionInviteResponse.instance(model, contactUserContext, contactUser)),
    );
};
