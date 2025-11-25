import { Serializer as JSONAPISerializer } from 'jsonapi-serializer';
import { Feedback } from '../feedback.model';
import { UserResponse } from './user-response';

class FeedbackResponse {
    static keys: (keyof FeedbackResponse)[] = ['id', 'category', 'description', 'user', 'created'];

    id = this.model.instance_id;
    category = this.model.category;
    description = this.model.feedback;
    created = this.model.created_at.toISOString();
    user: UserResponse;

    private constructor(private model: Feedback) {}

    static async instance(model: Feedback) {
        const ret = new FeedbackResponse(model);
        ret.user = await UserResponse.instance(model.user, { type: 'internal.base' });
        return ret;
    }
}

export const serialize = async (model: Feedback | Feedback[], meta?: { totalCount: number; totalPages: number }) => {
    const serializer = new JSONAPISerializer('feedbacks', {
        attributes: FeedbackResponse.keys,
        user: {
            ref: 'id',
            attributes: UserResponse.keys.gemSitlyUserSummarized,
        },
        keyForAttribute: 'camelCase',
        ...(meta ? { meta } : {}),
    });
    return serializer.serialize(
        Array.isArray(model)
            ? await Promise.all(model.map(item => FeedbackResponse.instance(item)))
            : await FeedbackResponse.instance(model),
    );
};
