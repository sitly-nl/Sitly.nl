import { Serializer as JSONAPISerializer } from 'jsonapi-serializer';
import { AnalyzerReplacements } from '../../services/text-analyzer.service';
import { UserResponse } from '../../models/serialize/user-response';
import { PhotoResponse } from '../../models/serialize/photo-response';
import { WarningResponse } from '../../models/serialize/warning-response';
import { MessageResponse } from '../../models/serialize/message-response';
import { PaymentResponse } from '../../models/serialize/payment-response';
import { SubscriptionResponse } from '../../models/serialize/subscription-response';
import { ReferenceResponse } from '../../models/serialize/reference-response';
import { ChildResponse } from '../../models/serialize/child-response';
import { RecommendationResponse } from '../../models/serialize/recommendation-response';
import { User } from '../../models/user/user.model';
import { UserWarningLevel } from '../../types';

export interface SitlyUserSerializerAdditionalData {
    conversationsCount?: number;
    replacedAboutTexts?: Map<number, AnalyzerReplacements>;
}

const detailsSerializer = (additionalData?: SitlyUserSerializerAdditionalData) => {
    return new JSONAPISerializer('user', {
        attributes: UserResponse.keys.gemSitlyUser,
        keyForAttribute: 'camelCase',
        typeForAttribute: (str, _attrVal) => {
            const map: Record<string, string> = {
                user: 'users',
                message: 'messages',
                place: 'places',
                similar: 'users',
                accessToken: 'tokens',
                photo: 'photos',
            };
            return map[str] ?? str;
        },
        dataMeta: {
            warningLevel: (user: UserResponse) => {
                if (
                    user.inappropriate ||
                    user.quarantinedAt ||
                    user.warnings?.some(item => item.warningLevel === UserWarningLevel.severe)
                ) {
                    return UserWarningLevel.severe;
                }

                if (user.warnings?.some(item => item.warningLevel === UserWarningLevel.moderate)) {
                    return UserWarningLevel.moderate;
                }
            },
            conversationsCount: () => {
                return additionalData?.conversationsCount;
            },
        },
        payments: {
            ref: 'id',
            attributes: PaymentResponse.keys,
        },
        dataLinks: {
            avatar: (user: UserResponse) => {
                return user.avatarUrl;
            },
        },
        subscription: {
            ref: 'id',
            attributes: SubscriptionResponse.keys,
        },
        children: {
            ref: 'id',
            attributes: ChildResponse.publicKeys,
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
                photo: (user: UserResponse, photo: PhotoResponse) => {
                    return photo.link;
                },
            },
        },
        warnings: {
            ref: 'id',
            attributes: WarningResponse.keys,
            message: {
                ref: 'id',
                attributes: MessageResponse.gemKeys,
            },
            photo: {
                ref: 'id',
                attributes: PhotoResponse.keys,
                includedLinks: {
                    photo: (_user: UserResponse, photo: PhotoResponse) => photo.link,
                },
            },
        },
    });
};
const overviewSerializer = (additionalData?: SitlyUserSerializerAdditionalData) => {
    const overviewSerializer = new JSONAPISerializer('user', {
        ...detailsSerializer(additionalData).opts,
        attributes: UserResponse.keys.gemSitlyUserSummarized,
    });

    if (additionalData?.replacedAboutTexts) {
        overviewSerializer.opts.dataMeta.replacedAbout = (user: UserResponse) =>
            additionalData.replacedAboutTexts?.get(user.id as number)?.replaced;
        overviewSerializer.opts.dataMeta.aboutReplacements = (user: UserResponse) =>
            additionalData.replacedAboutTexts?.get(user.id as number)?.replacements;
    }
    return overviewSerializer;
};

export async function serializeUser(data: User | User[], additionalData?: SitlyUserSerializerAdditionalData) {
    if (Array.isArray(data)) {
        return overviewSerializer(additionalData).serialize(
            await Promise.all(data.map(user => UserResponse.instance(user, { type: 'internal.base' }))),
        );
    } else {
        return detailsSerializer(additionalData).serialize(await UserResponse.instance(data, { type: 'internal.full' }));
    }
}
