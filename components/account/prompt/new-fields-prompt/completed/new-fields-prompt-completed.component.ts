import { Component, EventEmitter, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'new-fields-prompt-completed',
    templateUrl: './new-fields-prompt-completed.component.html',
    styleUrls: ['../new-fields-prompt.common.less', './new-fields-prompt-completed.component.less'],
    standalone: true,
    imports: [TranslateModule],
})
export class NewFieldsPromptCompletedComponent {
    @Output() next = new EventEmitter();
}
