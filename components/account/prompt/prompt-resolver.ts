import { allPromptTypes, Prompt, PromptType } from 'app/models/api/prompt';
import { RouteType } from 'routing/route-type';
import { EnvironmentService } from 'app/services/environment.service';
import { RouteService } from 'app/services/route.service';

export interface PromptResolver {
    isAppropriate(prompt: Prompt): boolean;
    isSupported(prompt: Prompt): boolean;
}

export abstract class BasePromptResolver {
    constructor(
        protected routeService: RouteService,
        protected environmentService: EnvironmentService,
    ) {}

    // if prompt type is not supported yet, the prompt should not be placed into the prompts queue
    isSupported(prompt: Prompt) {
        return allPromptTypes.includes(prompt.type);
    }
}

export class MobilePromptResolver extends BasePromptResolver implements PromptResolver {
    isAppropriate(prompt: Prompt) {
        if (this.routeService.hasModalRoute()) {
            return false;
        }

        switch (prompt.type) {
            case PromptType.recurringPaymentFailed:
            case PromptType.availabilityReminder:
            case PromptType.noAvailabilityReminder:
            case PromptType.avatarOverlay:
                return true;
            case PromptType.firstRecommendation:
            case PromptType.avatarReminder:
                return this.routeService.isRootRoute;
            case PromptType.positiveReviewEkomi:
            case PromptType.positiveReviewTrustpilot:
            case PromptType.positiveReviewGoogle:
                return this.routeService.isRootRoute && this.routeService.routeType() !== RouteType.favorites;
            case PromptType.negativeReview:
            case PromptType.positiveReview:
                return this.environmentService.isAndroidApp;
            case PromptType.fillNewProperties:
                return this.routeService.routeType() === RouteType.search;
            default:
                return false;
        }
    }
}

export class DesktopPromptResolver extends BasePromptResolver implements PromptResolver {
    isAppropriate(prompt: Prompt) {
        if (this.routeService.hasModalRoute()) {
            return false;
        }

        switch (prompt.type) {
            case PromptType.recurringPaymentFailed:
            case PromptType.avatarReminder:
            case PromptType.availabilityReminder:
            case PromptType.noAvailabilityReminder:
            case PromptType.positiveReviewEkomi:
            case PromptType.positiveReviewTrustpilot:
            case PromptType.positiveReviewGoogle:
            case PromptType.firstRecommendation:
            case PromptType.avatarOverlay:
                return true;
            case PromptType.negativeReview:
            case PromptType.positiveReview:
                return this.environmentService.isAndroidApp;
            case PromptType.fillNewProperties:
                return this.routeService.routeType() === RouteType.search;
            default:
                return false;
        }
    }
}
