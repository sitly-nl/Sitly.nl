import { Serializer as JSONAPISerializer } from 'jsonapi-serializer';
import { BrandCode } from '../models/brand-code';
import { UserResponse } from '../models/serialize/user-response';
import { PhotoResponse } from '../models/serialize/photo-response';
import { SubscriptionResponse } from '../models/serialize/subscription-response';
import { PlaceResponse } from '../models/serialize/place-response';
import { ChildResponse } from '../models/serialize/child-response';
import { ReferenceResponse } from '../models/serialize/reference-response';

export interface TokenResponse {
    id: string;
    token: string;
    countryCode: BrandCode;
    user?: UserResponse;
    completionUrl?: string;
}

export const serialize = (data: TokenResponse, reEnabled?: boolean) => {
    const serializer = new JSONAPISerializer('tokens', {
        attributes: ['token', 'user', 'countryCode'],
        keyForAttribute: 'camelCase',
        meta: {},
        topLevelLinks: {
            completionUrl: (data: TokenResponse) => {
                return data.completionUrl;
            },
        },
        user: {
            ref: 'id',
            attributes: [...UserResponse.keys.private, 'internalUserId'],
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
                attributes: ChildResponse.privateKeys,
            },
            references: {
                ref: 'id',
                attributes: ReferenceResponse.keys,
            },
            photos: {
                ref: 'id',
                attributes: PhotoResponse.keys,
                includedLinks: {
                    photo: (_data: TokenResponse, photo: PhotoResponse) => photo.link,
                },
            },
            includedLinks: {
                avatar: (result: TokenResponse) => {
                    return result.user?.avatarUrl;
                },
                publicProfile: (result: TokenResponse) => {
                    const user = result.user;
                    if (user?.hasPublicProfile) {
                        return user.publicProfileUrl;
                    }
                },
            },
        },
    });

    if (reEnabled) {
        serializer.opts.meta.reEnabled = true;
    }

    return serializer.serialize(data);
};
