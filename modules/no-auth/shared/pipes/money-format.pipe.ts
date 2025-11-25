import { Pipe, PipeTransform, ChangeDetectorRef, inject } from '@angular/core';
import { CountrySettingsService } from 'app/services/country-settings.service';
import { LocaleService } from 'app/services/locale.service';

@Pipe({
    name: 'moneyFormat',
    pure: false,
})
export class MoneyFormat implements PipeTransform {
    private cd = inject(ChangeDetectorRef);
    private countrySettingsService = inject(CountrySettingsService);
    private localeService = inject(LocaleService);

    private moneyFormat?: string;
    private defaultLocale: string;

    transform(value: number, params?: { minFractionDigits: number }) {
        if (typeof value !== 'number') {
            value = Number(value);
        }
        if (typeof value === 'number') {
            const minFractionDigits = params?.minFractionDigits ?? 0;
            if (!this.moneyFormat) {
                let ret = '';
                if (this.countrySettingsService.countrySettings?.moneyFormat) {
                    this.moneyFormat = this.countrySettingsService.countrySettings.moneyFormat;
                    ret = this.moneyFormat.replace(
                        '[amount]',
                        value.toLocaleString(this.localeService.getLocaleCode(), {
                            minimumFractionDigits: minFractionDigits,
                            maximumFractionDigits: 2,
                        }),
                    );
                    this.cd.markForCheck();
                }
                if (!ret) {
                    this.moneyFormat = this.countrySettingsService.countrySettings?.moneyFormat;
                    this.cd.markForCheck();
                }
                return ret;
            } else {
                return this.moneyFormat.replace(
                    '[amount]',
                    value.toLocaleString(this.defaultLocale, {
                        minimumFractionDigits: minFractionDigits,
                        maximumFractionDigits: 2,
                    }),
                );
            }
        }
        return '';
    }
}
