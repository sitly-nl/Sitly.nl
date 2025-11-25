import { StorageService } from 'app/services/storage.service';
import { map } from 'rxjs/operators';
import { CountrySettings } from 'app/models/api/country-settings-interface';
import { ApiService } from 'app/services/api/api.service';
import { Injectable, EventEmitter, inject } from '@angular/core';
import { ServerResponseData } from 'app/models/api/response';

@Injectable({
    providedIn: 'root',
})
export class CountrySettingsService {
    private readonly apiService = inject(ApiService);
    private readonly storageService = inject(StorageService);

    readonly changed = new EventEmitter<CountrySettings>();
    countrySettings = this.storageService.countrySettings;

    refreshCountrySettings() {
        return this.apiService.get('/country-settings').pipe(
            map(response => {
                const data = response.data as ServerResponseData[];
                const newConfig = data?.reduce((accumulator, current) => {
                    accumulator[current?.attributes?.id as keyof CountrySettings] = current?.attributes?.value as never;
                    return accumulator;
                }, {} as CountrySettings);
                this.updateIfNecessary(newConfig);
                return this.countrySettings;
            }),
        );
    }

    private updateIfNecessary(newConfig?: CountrySettings) {
        if (newConfig && JSON.stringify(this.countrySettings) !== JSON.stringify(newConfig)) {
            this.storageService.countrySettings = newConfig;
            this.countrySettings = newConfig;
            this.changed.emit(newConfig);
        }
    }
}
