import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BaseComponent } from 'app/components/base.component';
import { allFosterTraits } from 'app/models/api/user';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { FormCheckboxComponent } from 'app/components/common/form/checkbox.component';

@Component({
    selector: 'new-fields-prompt-traits',
    templateUrl: './new-fields-prompt-traits.component.html',
    styleUrls: ['../../new-fields-prompt.common.less', './new-fields-prompt-traits.component.less'],
    standalone: true,
    imports: [FormCheckboxComponent, FormsModule, TranslateModule],
})
export class NewFieldsPromptTraitsComponent extends BaseComponent {
    @Input({ required: true }) stepsCount: number;
    @Output() next = new EventEmitter();
    @Output() moveBack = new EventEmitter();

    traits = allFosterTraits.map(item => {
        return { label: item, selected: this.authUser.fosterProperties.traits?.includes(item) };
    });
    get selectedTraits() {
        return this.traits.filter(item => item.selected);
    }

    onNextPressed() {
        this.userService
            .saveUser({
                traits: this.selectedTraits.map(item => item.label),
            })
            .subscribe(_ => {
                this.next.emit();
            });
    }
}
