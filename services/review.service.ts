import { Injectable, inject } from '@angular/core';
import { StandardOverlayComponent } from 'app/components/common/overlay-content/standard-overlay/standard-overlay.component';
import { FeedbackService } from 'app/services/api/feedback.service';
import { OverlayService } from 'app/services/overlay/overlay.service';
import { PromptType } from 'app/models/api/prompt';
import { TrackingService } from 'app/services/tracking/tracking.service';
import { PromptEvents } from 'app/services/tracking/types';
import { FeedbackFlowService } from 'app/services/feedback-flow.service';
import { of } from 'rxjs';
import { Constants } from 'app/utils/constants';

export type RatingProvider = 'ekomi' | 'trustpilot' | 'google' | 'google-play';

@Injectable({
    providedIn: 'root',
})
export class ReviewService {
    private readonly feedbackService = inject(FeedbackService);
    private readonly overlayService = inject(OverlayService);
    private readonly trackingService = inject(TrackingService);
    private readonly feedbackFlowService = inject(FeedbackFlowService);

    showReviewPromptOverlay(type: PromptType) {
        this.overlayService.openOverlay(StandardOverlayComponent, {
            title: 'reviewOverlay.title',
            primaryBtn: {
                title: 'reviewOverlay.cta.positive',
                action: () => {
                    this.showPositiveExperienceOverlay(type);
                    this.trackingService.trackPromptClickEvent(PromptEvents.reviewEnjoyingYes);
                },
            },
            secondaryBtn: {
                title: 'reviewOverlay.cta.negative',
                action: () => {
                    this.showNegativeExperienceOverlay();
                    this.trackingService.trackPromptClickEvent(PromptEvents.reviewEnjoyingYes);
                },
            },
        });
    }

    private showNegativeExperienceOverlay() {
        this.overlayService.openOverlay(StandardOverlayComponent, {
            title: 'negativeReviewOverlay.title',
            primaryBtn: {
                title: 'negativeReviewOverlay.cta.positive',
                action: () => {
                    this.feedbackFlowService.start();
                    this.trackingService.trackPromptClickEvent(PromptEvents.reviewEnjoyingNotReallyFeedback);
                },
            },
            secondaryBtn: {
                title: 'negativeReviewOverlay.cta.negative',
                action: () => {
                    this.trackingService.trackPromptClickEvent(PromptEvents.reviewEnjoyingNotReallyNoThanks);
                },
            },
        });
    }

    private showPositiveExperienceOverlay(promptType: PromptType) {
        const ratingProvider = this.getRatingProvider(promptType);
        const title = this.getPositiveReviewOverlayTitle(ratingProvider);
        this.overlayService.openOverlay(StandardOverlayComponent, {
            title,
            primaryBtn: { title: 'positiveReviewOverlay.cta.positive', action: () => this.goToReviewPage(ratingProvider) },
            secondaryBtn: {
                title: 'positiveReviewOverlay.cta.negative',
                action: () => {
                    this.trackingService.trackPromptClickEvent(PromptEvents.reviewEnjoyingYesNoThanks);
                },
            },
        });
    }

    private goToReviewPage(ratingProvider: RatingProvider) {
        if (ratingProvider === 'google-play') {
            this.trackingService.trackPromptClickEvent(PromptEvents.reviewEnjoyingYesSureTrustpilot);
        } else if (ratingProvider === 'trustpilot') {
            this.trackingService.trackPromptClickEvent(PromptEvents.reviewEnjoyingYesSureTrustpilot);
        } else if (ratingProvider === 'google') {
            this.trackingService.trackPromptClickEvent(PromptEvents.reviewEnjoyingYesSureGoogle);
        } else {
            this.trackingService.trackPromptClickEvent(PromptEvents.reviewEnjoyingYesSureEkomi);
        }

        if (ratingProvider !== 'google-play') {
            const windowRef = window.open();
            if (windowRef) {
                this.getRatingLink(ratingProvider).subscribe(
                    link => {
                        if (link) {
                            windowRef.location.href = link;
                        }
                    },
                    _ => windowRef.close(),
                );
            }
        } else {
            const link = document.createElement('a');
            link.href = Constants.googlePlayUrl;
            link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));

            window.URL.revokeObjectURL(Constants.googlePlayUrl);
            link.remove();
        }
    }

    private getRatingLink(ratingProvider: RatingProvider) {
        if (ratingProvider === 'google-play') {
            return of(Constants.googlePlayUrl);
        } else if (ratingProvider === 'trustpilot') {
            return this.feedbackService.getTrustpilotLink();
        } else if (ratingProvider === 'google') {
            return this.feedbackService.getGoogleLink();
        } else {
            return this.feedbackService.getEkomiLink();
        }
    }

    private getRatingProvider(type: PromptType) {
        switch (type) {
            case PromptType.negativeReview:
            case PromptType.positiveReview:
                return 'google-play';
            case PromptType.positiveReviewGoogle:
                return 'google';
            case PromptType.positiveReviewTrustpilot:
                return 'trustpilot';
            default:
                return 'ekomi';
        }
    }

    private getPositiveReviewOverlayTitle(ratingProvider: RatingProvider) {
        switch (ratingProvider) {
            case 'google-play':
                return 'positiveReviewOverlay.title.googlePlay';
            case 'google':
                return 'positiveReviewOverlay.title.google';
            case 'trustpilot':
                return 'positiveReviewOverlay.title.trustpilot';
            default:
                return 'positiveReviewOverlay.title.ekomi';
        }
    }
}
