import { BaseApiModel } from 'app/models/api/response';

export enum PromptType {
    fillNewProperties = 'fillNewProperties',
    recurringPaymentFailed = 'recurringPaymentFailed',
    avatarReminder = 'avatarReminder',
    availabilityReminder = 'availabilityReminder',
    noAvailabilityReminder = 'noAvailabilityReminder',
    negativeReview = 'negativeReview',
    positiveReview = 'positiveReview',
    positiveReviewEkomi = 'positiveReviewEkomi',
    positiveReviewTrustpilot = 'positiveReviewTrustpilot',
    positiveReviewGoogle = 'positiveReviewGoogle',
    firstRecommendation = 'firstRecommendation',
    avatarOverlay = 'avatarOverlay',
}
export const allPromptTypes = Object.values(PromptType);

export class Prompt extends BaseApiModel {
    type: PromptType;
    delay = 0;

    static promptWithType(promptType: PromptType, delay = 0) {
        const prompt = new Prompt();
        prompt.type = promptType;
        prompt.delay = delay;
        return prompt;
    }
}
