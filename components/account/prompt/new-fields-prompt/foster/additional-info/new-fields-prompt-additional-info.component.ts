import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BaseComponent } from 'app/components/base.component';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { FormCheckboxComponent } from 'app/components/common/form/checkbox.component';

@Component({
    selector: 'new-fields-prompt-additional-info',
    templateUrl: './new-fields-prompt-additional-info.component.html',
    styleUrls: ['../../new-fields-prompt.common.less'],
    standalone: true,
    imports: [FormCheckboxComponent, FormsModule, TranslateModule],
})
export class NewFieldsPromptAdditionalInfoComponent extends BaseComponent {
    @Input({ required: true }) stepsCount: number;
    @Output() next = new EventEmitter();
    @Output() moveBack = new EventEmitter();

    onNextPressed() {
        this.userService
            .saveUser({
                hasFirstAidCertificate: this.authUser.fosterProperties.hasFirstAidCertificate ?? false,
                hasCertificateOfGoodBehavior: this.authUser.fosterProperties.hasCertificateOfGoodBehavior ?? false,
                hasCar: this.authUser.fosterProperties.hasCar ?? false,
            })
            .subscribe(_ => {
                this.next.emit();
            });
    }
}
