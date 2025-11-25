import { Recommendation } from '../recommendation.model';
import { Serializer as JSONAPISerializer } from 'jsonapi-serializer';
import { UserResponse } from './user-response';

export class RecommendationResponse {
    static readonly keys: (keyof RecommendationResponse)[] = ['id', 'authorName', 'description', 'score', 'created'];
    static readonly externalKeys: (keyof RecommendationResponse)[] = ['id', 'authorName', 'user', 'status'];

    id = this.recommendation.instance_id;
    authorName = this.recommendation.author_name;
    description = this.recommendation.description;
    score = this.recommendation.score;
    created = this.recommendation.created_at.toISOString();
    status = this.recommendation.recommendation_status;

    user?: UserResponse;

    private constructor(private recommendation: Recommendation) {}

    static instance(recommendation: Recommendation) {
        return new RecommendationResponse(recommendation);
    }
    static async externalInstance(recommendation: Recommendation) {
        const ret = new RecommendationResponse(recommendation);
        if (recommendation.user) {
            ret.user = await UserResponse.instance(recommendation.user, { type: 'regular.base' });
        }
        return ret;
    }
}

export const serializeExternal = async (model: Recommendation) => {
    const serializer = new JSONAPISerializer('recommendations', {
        attributes: RecommendationResponse.externalKeys,
        keyForAttribute: 'camelCase',
        user: {
            ref: 'id',
            attributes: ['id', 'firstName', 'gender'],
            includedLinks: {
                avatar: (_mainModel: unknown, user: UserResponse) => {
                    return user.avatarUrl;
                },
            },
        },
    });
    return serializer.serialize(await RecommendationResponse.externalInstance(model));
};
