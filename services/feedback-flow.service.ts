import { Injectable, inject } from '@angular/core';
import { FeedbackFormComponent } from 'app/components/feedback/feedback-form/feedback-form.component';
import { FeedbackInfoComponent } from 'app/components/feedback/feedback-info/feedback-info.component';
import { FeedbackStartComponent } from 'app/components/feedback/feedback-start/feedback-start.component';
import { OverlayService } from 'app/services/overlay/overlay.service';
import { FeedbackService } from 'app/services/api/feedback.service';
import { StandardOverlayComponent } from 'app/components/common/overlay-content/standard-overlay/standard-overlay.component';

export enum FeedbackType {
    responseRate = 'responseRate',
    premiumPricey = 'premiumPricey',
    other = 'other',
}

@Injectable({
    providedIn: 'root',
})
export class FeedbackFlowService {
    private readonly overlayService = inject(OverlayService);
    private readonly feedbackService = inject(FeedbackService);

    start() {
        const component = this.overlayService.openOverlay(FeedbackStartComponent);
        component.action.subscribe(type => {
            this.overlayService.closeAll(() => {
                if (type !== FeedbackType.other) {
                    this.openFeedbackInfoOverlay(type);
                } else {
                    this.openFeedbackFormOverlay();
                }
            });
        });
    }

    private openFeedbackInfoOverlay(type: FeedbackType) {
        const component = this.overlayService.openOverlay(FeedbackInfoComponent);
        component.feedbackType = type;
        component.writeFeedback.subscribe(() => {
            this.openFeedbackFormOverlay();
        });
    }

    private openFeedbackFormOverlay() {
        const component = this.overlayService.openOverlay(FeedbackFormComponent);
        component.onFeedback.subscribe(text => {
            this.overlayService.closeAll();
            this.feedbackService.postFeedback(text).subscribe(() => this.openFeedbackSuccessOverlay());
        });
    }

    private openFeedbackSuccessOverlay() {
        this.overlayService.openOverlay(StandardOverlayComponent, {
            title: 'prompts.reviewAlertSentTitle',
            message: 'prompts.feedbackSentMessage',
            textAlignLeft: true,
            primaryBtn: { title: 'main.close' },
        });
    }
}
