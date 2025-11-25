import { LinkFunction, Serializer as JSONAPISerializer } from 'jsonapi-serializer';
import { UserResponse, UserSerializationType } from '../../models/serialize/user-response';
import { PhotoResponse } from '../../models/serialize/photo-response';
import { SubscriptionResponse } from '../../models/serialize/subscription-response';
import { PlaceResponse } from '../../models/serialize/place-response';
import { ChildResponse } from '../../models/serialize/child-response';
import { ReferenceResponse } from '../../models/serialize/reference-response';
import { RecommendationResponse } from '../../models/serialize/recommendation-response';
import { User } from '../../models/user/user.model';

const getSerializerOptions = (isPublic: boolean, metaInfo?: UserSerializerMeta) => {
    return {
        keyForAttribute: 'camelCase',
        typeForAttribute: (str: string, _attrVal: unknown) => {
            const map: Record<string, string> = {
                user: 'users',
                place: 'places',
                similar: 'users',
                accessToken: 'tokens',
            };
            const type = map[str] ? map[str] : str;
            return type;
        },
        attributes: isPublic ? UserResponse.keys.public : [...UserResponse.keys.private, 'internalUserId'],
        dataMeta: {
            distance: (user: UserResponse) => {
                return {
                    kilometers: user.distance,
                };
            },
            isFavorite: (user: UserResponse) => {
                return user.isFavorite;
            },
            hasConversation: (user: UserResponse) => {
                return user.hasConversation;
            },
            freePremiumExtensionAvailable: (user: UserResponse) => {
                return user.freePremiumExtensionAvailable;
            },
            hasAvatarWarning: (user: UserResponse) => {
                return user.hasAvatarWarning;
            },
            potentialNonresponder: (user: UserResponse) => {
                return user.potentialNonresponder;
            },
            inviteToApply: (user: UserResponse) => {
                return user.inviteToApply;
            },
            intercomHmac: (user: UserResponse) => {
                return user.intercomHmac;
            },
            relevanceSortingStats: (user: UserResponse) => {
                return user.relevanceSortingStats;
            },
            zoomLevel: (user: UserResponse) => {
                if (user.initialZoomLevel) {
                    return user.initialZoomLevel;
                }
            },
            hasSentConnectionInviteToMe: (user: UserResponse) => user.hasSentConnectionInviteToMe,
            hasReceivedConnectionInviteFromMe: (user: UserResponse) => user.hasReceivedConnectionInviteFromMe,
        },
        dataLinks: {
            avatar: (user: UserResponse) => {
                return user.avatarUrl;
            },
            publicProfile: (user: UserResponse) => {
                if (user.hasPublicProfile) {
                    return user.publicProfileUrl;
                }
            },
            completionUrl: (user: UserResponse) => {
                return user.completionUrl;
            },
        },
        meta: Object.assign(metaInfo?.meta ?? {}, {
            reEnabled: (user: UserResponse) => {
                if (user.reEnabled) {
                    return true;
                }
            },
        }),
        topLevelLinks: Object.assign(metaInfo?.links ?? {}, {
            completionUrl: (user: UserResponse) => {
                return user.completionUrl;
            },
        }),
        place: {
            ref: 'id',
            attributes: PlaceResponse.keys,
        },
        subscription: {
            ref: 'id',
            attributes: SubscriptionResponse.keys,
        },
        children: {
            ref: 'id',
            attributes: isPublic ? ChildResponse.publicKeys : ChildResponse.privateKeys,
        },
        references: {
            ref: 'id',
            attributes: ReferenceResponse.keys,
        },
        recommendations: {
            ref: 'id',
            attributes: RecommendationResponse.keys,
        },
        photos: {
            ref: 'id',
            attributes: PhotoResponse.keys,
            includedLinks: {
                photo: (_user: UserResponse, photo: PhotoResponse) => photo.link,
            },
        },
        accessToken: {
            ref: 'id',
            attributes: ['token', 'countryCode'],
        },
        similar: includedUserOptions({
            children: {
                ref: 'id',
                attributes: ChildResponse.publicKeys,
            },
            recommendations: {
                ref: 'id',
                attributes: RecommendationResponse.keys,
            },
            place: {
                ref: 'id',
                attributes: PlaceResponse.keys,
            },
        }),
    };
};

export interface UserSerializerMeta {
    meta: Record<string, unknown>;
    links?: Record<string, string | LinkFunction>;
}

export async function serializeUser({
    data,
    contextUser,
    localeCode,
    includes = [],
    metaInfo,
    serializationType,
    customSetter,
}: {
    data: User | User[];
    contextUser: User | undefined;
    localeCode: string;
    includes?: string[];
    metaInfo?: UserSerializerMeta;
    serializationType?: UserSerializationType;
    customSetter?: (user: User, userResponse: UserResponse) => Promise<void> | void;
}) {
    const type =
        serializationType ??
        (Array.isArray(data) ? 'regular.base' : data.webuser_id === contextUser?.webuser_id ? 'regular.me' : 'regular.full');
    const context = {
        type,
        localeCode,
        include: {
            place: includes.includes('place'),
            subscription: includes.includes('subscription'),
            references: includes.includes('references'),
        },
        user: contextUser,
        customSetter,
    };

    const mapped = await (Array.isArray(data)
        ? Promise.all(data.map(user => UserResponse.instance(user, context)))
        : UserResponse.instance(data, context));
    return new JSONAPISerializer('user', getSerializerOptions(type !== 'regular.me', metaInfo)).serialize(mapped);
}

export const includedUserOptions = (otherOptions: object) => {
    return {
        ref: 'id',
        attributes: UserResponse.keys.public,
        dataMeta: {
            distance: (_mainModel: unknown, user: UserResponse) => {
                return { kilometers: user.distance };
            },
            isFavorite: (_mainModel: unknown, user: UserResponse) => user.isFavorite,
        },
        includedLinks: {
            avatar: (_mainModel: unknown, user: UserResponse) => {
                return user.avatarUrl;
            },
        },
        ...otherOptions,
    };
};
