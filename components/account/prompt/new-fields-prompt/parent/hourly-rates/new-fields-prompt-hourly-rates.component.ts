import { Component, Output, EventEmitter, Input } from '@angular/core';
import { BaseComponent } from 'app/components/base.component';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { FormCheckboxComponent } from 'app/components/common/form/checkbox.component';

@Component({
    selector: 'new-fields-prompt-hourly-rates',
    templateUrl: './new-fields-prompt-hourly-rates.component.html',
    styleUrls: ['../../new-fields-prompt.common.less'],
    standalone: true,
    imports: [FormCheckboxComponent, FormsModule, TranslateModule],
})
export class NewFieldsPromptHourlyRatesComponent extends BaseComponent {
    @Input({ required: true }) stepsCount: number;
    @Output() next = new EventEmitter();
    @Output() moveBack = new EventEmitter();

    hourlyRatesOptions = this.countrySettings.hourlyRateOptions.map(item => {
        return { ...item, selected: this.authUser.searchPreferences.hourlyRates?.includes(item.value) };
    });

    onNextPressed() {
        this.userService
            .saveUser({
                hourlyRatesPreference: this.hourlyRatesOptions.filter(item => item.selected).map(item => item.value),
            })
            .subscribe(_ => {
                this.next.emit();
            });
    }
}
