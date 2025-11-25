import { Component, Input, Output, EventEmitter } from '@angular/core';
import { BaseOverlayComponent } from 'app/components/common/overlay-content/base-overlay.component';
import { FeedbackType } from 'app/services/feedback-flow.service';
import { SharedModule } from 'modules/shared/shared.module';

@Component({
    selector: 'feedback-info',
    templateUrl: './feedback-info.component.html',
    styleUrls: ['./feedback-info.component.less'],
    standalone: true,
    imports: [SharedModule],
})
export class FeedbackInfoComponent extends BaseOverlayComponent {
    @Input() feedbackType = FeedbackType.responseRate;
    @Output() writeFeedback = new EventEmitter();
    FeedbackType = FeedbackType;

    ngOnInit() {
        this.data.set({
            primaryBtn: {
                title: 'feedback.writeFeedback',
                action: () => this.writeFeedback.emit(),
            },
            secondaryBtn: {
                title: 'main.close',
            },
            title: this.feedbackType === FeedbackType.premiumPricey ? 'feedback.disagreeToPayTitle' : 'feedback.noResponsesTitle',
            message:
                this.feedbackType === FeedbackType.premiumPricey
                    ? 'feedback.disagreeToPayContent'
                    : this.authUser.isParent
                      ? 'feedback.noResponsesParentContent'
                      : 'feedback.noResponsesBabysitterContent',
            textAlignLeft: true,
        });
    }
}
