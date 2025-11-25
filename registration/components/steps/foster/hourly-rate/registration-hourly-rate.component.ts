import { Component } from '@angular/core';
import { RegistrationBaseComponent } from 'registration/components/registration-base.component';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';
import { RegistrationPageContainerComponent } from 'registration/components/page-container/registration-page-container.component';

@Component({
    selector: 'registration-hourly-rate',
    templateUrl: './registration-hourly-rate.component.html',
    styleUrls: ['./registration-hourly-rate.component.less'],
    standalone: true,
    imports: [RegistrationPageContainerComponent, SharedModule, TranslateModule],
})
export class RegistrationHourlyRateComponent extends RegistrationBaseComponent {
    averageHourlyRate?: string;

    ngOnInit() {
        this.userService.cityRatesStatistic().subscribe(res => {
            this.averageHourlyRate = res.meta?.averageHourlyRateFormatted as string;
            if (this.averageHourlyRate) {
                this.showToastWithDefaultDelay();
            }
        });
    }

    save(value: string) {
        this.userService
            .saveUser({
                averageHourlyRate: value,
            })
            .subscribe();
        this.handleNextClick();
    }
}
