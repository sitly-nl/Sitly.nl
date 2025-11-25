import { Component } from '@angular/core';
import { RegistrationBaseComponent } from 'registration/components/registration-base.component';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';
import { RegistrationPageContainerComponent } from 'registration/components/page-container/registration-page-container.component';

@Component({
    selector: 'registration-willing-to-pay',
    templateUrl: './registration-willing-to-pay.component.html',
    styleUrls: ['./registration-willing-to-pay.component.less'],
    standalone: true,
    imports: [RegistrationPageContainerComponent, SharedModule, TranslateModule],
})
export class RegistrationWillingToPayComponent extends RegistrationBaseComponent {
    options = this.countrySettings.hourlyRateOptions.map(item => {
        return { ...item, selected: this.authUser.searchPreferences.hourlyRates?.includes(item.value) };
    });
    averageHourlyRate?: string;

    ngOnInit() {
        this.userService.cityRatesStatistic().subscribe(res => {
            this.averageHourlyRate = res.meta?.averageHourlyRateFormatted as string;
            if (this.averageHourlyRate) {
                this.showToastWithDefaultDelay();
            }
        });
    }

    handleNextClick() {
        this.userService
            .saveUser({
                hourlyRatesPreference: this.options.filter(item => item.selected).map(item => item.value),
            })
            .subscribe();
        super.handleNextClick();
    }
}
