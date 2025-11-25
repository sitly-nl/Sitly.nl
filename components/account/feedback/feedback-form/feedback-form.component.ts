import { Component, ViewChild, ElementRef, EventEmitter, Output } from '@angular/core';
import { BaseOverlayComponent } from 'app/components/common/overlay-content/base-overlay.component';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { MatInput } from '@angular/material/input';
import { MatFormField } from '@angular/material/form-field';
import { SharedModule } from 'modules/shared/shared.module';

@Component({
    selector: 'feedback-form',
    templateUrl: './feedback-form.component.html',
    styleUrls: ['./feedback-form.component.less'],
    standalone: true,
    imports: [SharedModule, MatFormField, MatInput, CdkTextareaAutosize, FormsModule, TranslateModule],
})
export class FeedbackFormComponent extends BaseOverlayComponent {
    @ViewChild('textInput', { static: true }) textInputRef: ElementRef<HTMLTextAreaElement>;

    @Output() onFeedback = new EventEmitter<string>();

    get hasInputError() {
        return this.feedbackText.length < this.feedbackTextMinLength;
    }

    get charactersLeft() {
        return this.feedbackTextMinLength - this.feedbackText.length;
    }

    get feedbackText() {
        return this.textInputRef.nativeElement.value;
    }

    private readonly feedbackTextMinLength = 30;

    ngOnInit() {
        this.data.set({
            title: 'feedback.whatCanWeImprove',
            message: 'feedback.formInputDescription',
            primaryBtn: {
                title: 'main.send',
                stayOpenOnClick: true,
                action: () => {
                    if (!this.hasInputError) {
                        this.onFeedback.emit(this.feedbackText);
                    }
                },
            },
        });
    }
}
