import { Component } from '@angular/core';
import { ProfileBlockComponent } from 'app/components/user/profile/common/profile-block/profile-block.component';
import { HourlyRateOption } from 'app/models/api/country-settings-interface';
import { FosterChores } from 'app/models/api/user';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';
import { LowerCasePipe } from '@angular/common';

@Component({
    selector: 'profile-job-description',
    templateUrl: './profile-job-description.component.html',
    styleUrls: ['./profile-job-description.component.less'],
    standalone: true,
    imports: [SharedModule, LowerCasePipe, TranslateModule],
})
export class ProfileJobDescriptionComponent extends ProfileBlockComponent {
    get hasFosterLocation() {
        return this.user.searchPreferences?.fosterLocation?.receive || this.user.searchPreferences?.fosterLocation?.visit;
    }

    get hourlyRatesShort() {
        if (!this.hasHourlyRates || !this.translations || !this.ratesRange) {
            return '';
        }

        if (this.hasNegotiableRate) {
            return this.translations['profile.jobDescription.negotiable'];
        }

        const moneyFormat = this.countrySettingsService.countrySettings?.hourlyRateMoneyFormat ?? '';
        if (this.ratesRange.min === 0 && this.ratesRange.max < Number.MAX_VALUE) {
            return `< ${moneyFormat.replace('[amount]', this.ratesRange.max.toString())}`;
        }

        if (this.ratesRange.min > 0 && this.ratesRange.max === Number.MAX_VALUE) {
            return `> ${moneyFormat.replace('[amount]', this.ratesRange.min.toString())}`;
        }

        const amount = `${this.ratesRange.min} - ${this.ratesRange.max}`;
        return moneyFormat.replace('[amount]', amount);
    }

    get hourlyRatesLong() {
        if (!this.hasHourlyRates || !this.translations || !this.ratesRange) {
            return '';
        }

        if (this.hasNegotiableRate) {
            return this.translations['profile.jobDescription.negotiable'];
        }

        const moneyFormat = this.countrySettingsService.countrySettings?.hourlyRateMoneyFormat ?? '';
        if (this.ratesRange.min === 0 && this.ratesRange.max < Number.MAX_VALUE) {
            const currencyAmount = moneyFormat.replace('[amount]', this.ratesRange.max.toString());
            return this.translations['profile.jobDescription.upToAmount'].replace('{{amount}}', currencyAmount);
        }

        if (this.ratesRange.min > 0 && this.ratesRange.max === Number.MAX_VALUE) {
            const currencyAmount = moneyFormat.replace('[amount]', this.ratesRange.min.toString());
            return this.translations['profile.jobDescription.moreThanAmount'].replace('{{amount}}', currencyAmount);
        }

        const minAmount = moneyFormat.replace('[amount]', this.ratesRange.min.toString());
        const maxAmount = moneyFormat.replace('[amount]', this.ratesRange.max.toString());
        return this.translations['profile.jobDescription.betweenAmount']
            .replace('{{minAmount}}', minAmount)
            .replace('{{maxAmount}}', maxAmount);
    }

    get hasNegotiableRate() {
        return this.ratesRange?.negotiate || (this.ratesRange?.min === 0 && this.ratesRange?.max === Number.MAX_VALUE);
    }

    get hasHourlyRates() {
        return (this.user.searchPreferences.hourlyRates ?? []).length > 0;
    }

    get hasChores() {
        return (this.user?.searchPreferences?.chores?.length ?? 0) > 0 || this.user?.remoteTutoring;
    }

    choresOptions = [
        { code: FosterChores.cooking, value: false },
        { code: FosterChores.driving, value: false },
        { code: FosterChores.homework, value: false },
        { code: FosterChores.shopping, value: false },
        { code: FosterChores.chores, value: false },
    ];

    private translations: Record<string, string>;
    private _ratesRange?: { min: number; max: number; negotiate: boolean };
    private get ratesRange() {
        this._ratesRange = this._ratesRange ?? this.getRatesRange();
        return this._ratesRange;
    }

    ngOnInit() {
        this.translateService
            .get([
                'profile.jobDescription.upToAmount',
                'profile.jobDescription.betweenAmount',
                'profile.jobDescription.moreThanAmount',
                'profile.jobDescription.negotiable',
            ])
            .subscribe(translations => {
                this.translations = translations;
                this.cd.markForCheck();
            });

        if (this.hasChores) {
            this.choresOptions.forEach(item => {
                item.value = !!this.user?.searchPreferences?.chores?.find(chore => chore === item.code);
                // map online tutoring to homework chore
                if (item.code === FosterChores.homework && this.user?.remoteTutoring) {
                    item.value = true;
                }
            });
            this.choresOptions.sort((a, b) => {
                if (a.value && !b.value) {
                    return -1;
                } else if (!a.value && b.value) {
                    return 1;
                } else {
                    return 0;
                }
            });
        }
    }

    private getRatesRange() {
        if (!this.user.searchPreferences.hourlyRates) {
            return undefined;
        }

        const userRates =
            this.user.searchPreferences.hourlyRates
                .map(rateItem => this.countrySettingsService.countrySettings?.hourlyRateOptions.find(option => option.value === rateItem))
                .filter(item => item !== undefined) ?? [];

        let minValue = Number.MAX_VALUE;
        let maxValue = 0;
        userRates.forEach(rate => {
            const parsedRate = this.parseRate(rate);
            minValue = Math.min(parsedRate.min, minValue);
            maxValue = Math.max(parsedRate.max, maxValue);
        });

        return {
            min: minValue,
            max: maxValue,
            negotiate: minValue === 0 && maxValue === Number.MAX_VALUE,
        };
    }

    private parseRate(option: HourlyRateOption) {
        const regExp = /\d+/g;
        const numbers = option.label.match(regExp);
        const min = option.value.includes('negotiate') || option.value.includes('min') ? 0 : parseInt(numbers?.[0] ?? '');
        const max =
            option.value.includes('negotiate') || option.value.includes('plus')
                ? Number.MAX_VALUE
                : parseInt(numbers?.[numbers.length - 1] ?? '');
        return { min, max };
    }
}
