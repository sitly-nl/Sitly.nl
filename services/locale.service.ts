import { inject, Injectable } from '@angular/core';
import { StorageService } from 'app/services/storage.service';
import { UserService } from 'app/services/user.service';
import { User } from 'app/models/api/user';
import { CountrySettingsService } from 'app/services/country-settings.service';

@Injectable({
    providedIn: 'root',
})
export class LocaleService {
    private readonly storageService = inject(StorageService);
    private readonly userService = inject(UserService);
    private readonly countrySettingsService = inject(CountrySettingsService);

    private get defaultLocale() {
        return this.countrySettingsService.countrySettings?.defaultLocale ?? 'en-GB';
    }

    constructor() {
        if (!this.storageService.localeCode) {
            this.saveUserLocale();
        }
    }

    getLanguageCode() {
        return this.getLocaleCode().substring(0, 2);
    }

    getLocaleCode() {
        return this.userService.authUser?.localeCode ?? this.storageService.localeCode ?? this.defaultLocale;
    }

    saveUserLocale(arg?: User | string) {
        const localeCode = (arg instanceof User ? arg.localeCode : arg) ?? this.defaultLocale;
        const hasChanged = this.storageService.localeCode !== localeCode;
        this.storageService.localeCode = localeCode;
        return { localeCode, hasChanged };
    }
}
