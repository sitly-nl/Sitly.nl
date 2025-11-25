import { Gender } from 'app/models/api/user';
import { Component, Output, EventEmitter, Input } from '@angular/core';
import { BaseComponent } from 'app/components/base.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'new-fields-prompt-gender',
    templateUrl: './new-fields-prompt-gender.component.html',
    styleUrls: ['../../new-fields-prompt.common.less', './new-fields-prompt-gender.component.less'],
    standalone: true,
    imports: [TranslateModule],
})
export class NewFieldsPromptGenderComponent extends BaseComponent {
    @Input({ required: true }) stepsCount: number;
    @Output() next = new EventEmitter();

    Gender = Gender;

    updateUser(gender: Gender) {
        this.userService.saveUser({ gender }).subscribe(_ => {
            this.next.emit();
        });
    }
}
