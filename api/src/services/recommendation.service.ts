import { Conversation } from '../models/conversation.model';
import { MessageType } from '../models/message.types';
import { User } from '../models/user/user.model';
import { FeaturesService } from './features/features.service';

export class RecommendationService {
    static async recommendationEnabled(conversation: Conversation, user: User, chatPartner: User) {
        if (!conversation.successful_at || !FeaturesService.showRecommendations(conversation.brandCode) || !chatPartner.availableForChat) {
            return false;
        }
        const [recommendationsCount, autoRejectionCount] = await Promise.all([
            conversation.sequelize.models.Recommendation.countForUsers(user.webuser_id, chatPartner.webuser_id),
            conversation.messagesCount({ message_type: MessageType.autoRejection }),
        ]);
        return recommendationsCount === 0 && autoRejectionCount === 0;
    }
}
