import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BaseComponent } from 'app/components/base.component';
import { allFosterSkills } from 'app/models/api/user';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { FormCheckboxComponent } from 'app/components/common/form/checkbox.component';

@Component({
    selector: 'new-fields-prompt-skills',
    templateUrl: './new-fields-prompt-skills.component.html',
    styleUrls: ['../../new-fields-prompt.common.less'],
    standalone: true,
    imports: [FormCheckboxComponent, FormsModule, TranslateModule],
})
export class NewFieldsPromptSkillsComponent extends BaseComponent {
    @Input({ required: true }) stepsCount: number;
    @Output() next = new EventEmitter();
    @Output() moveBack = new EventEmitter();

    skills = allFosterSkills.map(item => {
        return { label: item, selected: this.authUser.fosterProperties.skills?.includes(item) };
    });

    onNextPressed() {
        this.userService
            .saveUser({
                skills: this.skills.filter(item => item.selected).map(item => item.label),
            })
            .subscribe(_ => {
                this.next.emit();
            });
    }
}
