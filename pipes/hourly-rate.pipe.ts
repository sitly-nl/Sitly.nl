import { Pipe, PipeTransform, inject } from '@angular/core';
import { CountrySettingsService } from 'app/services/country-settings.service';

@Pipe({
    name: 'hourlyRate',
    standalone: true,
})
export class HourlyRatePipe implements PipeTransform {
    private countrySettingsService = inject(CountrySettingsService);

    transform(value?: string) {
        if (!value) {
            return null;
        }

        return this.countrySettingsService.countrySettings?.hourlyRateOptions.find(item => item.value === value)?.label;
    }
}
