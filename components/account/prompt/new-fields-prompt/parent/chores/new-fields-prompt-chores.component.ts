import { allFosterChores } from 'app/models/api/user';
import { BaseComponent } from 'app/components/base.component';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { FormCheckboxComponent } from 'app/components/common/form/checkbox.component';

@Component({
    selector: 'new-fields-prompt-chores',
    templateUrl: './new-fields-prompt-chores.component.html',
    styleUrls: ['../../new-fields-prompt.common.less'],
    standalone: true,
    imports: [FormCheckboxComponent, FormsModule, TranslateModule],
})
export class NewFieldsPromptChoresComponent extends BaseComponent {
    @Input({ required: true }) stepsCount: number;
    @Output() next = new EventEmitter();
    @Output() moveBack = new EventEmitter();

    chores = allFosterChores.map(item => {
        return { label: item, selected: this.authUser.searchPreferences.chores?.includes(item) };
    });

    onNextPressed() {
        this.userService
            .saveUser({
                choresPreference: this.chores.filter(item => item.selected).map(item => item.label),
            })
            .subscribe(_ => {
                this.next.emit();
            });
    }
}
