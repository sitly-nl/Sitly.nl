import { Component, EventEmitter, Output } from '@angular/core';
import { BaseOverlayComponent } from 'app/components/common/overlay-content/base-overlay.component';
import { FeedbackType } from 'app/services/feedback-flow.service';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';

@Component({
    selector: 'feedback-start',
    templateUrl: './feedback-start.component.html',
    styleUrls: ['./feedback-start.component.less'],
    standalone: true,
    imports: [SharedModule, TranslateModule],
})
export class FeedbackStartComponent extends BaseOverlayComponent {
    @Output() action = new EventEmitter<FeedbackType>();
    FeedbackType = FeedbackType;

    ngOnInit() {
        this.data.set({
            title: 'feedbackReasonsOverlay.title',
        });
    }
}
