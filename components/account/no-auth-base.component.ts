import { Component, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CountrySettingsService } from 'app/services/country-settings.service';
import { EnvironmentService } from 'app/services/environment.service';
import { LocaleService } from 'app/services/locale.service';
import { NavigationService } from 'app/services/navigation.service';
import { OverlayService } from 'app/services/overlay/overlay.service';
import { RouteService } from 'app/services/route.service';
import { StorageService } from 'app/services/storage.service';
import { TrackingService } from 'app/services/tracking/tracking.service';
import { UserService } from 'app/services/user.service';
import { EnvironmentUtils } from 'app/utils/device-utils';
import { Subject } from 'rxjs';

@Component({
    template: '',
})
export abstract class NoAuthBaseComponent implements OnDestroy {
    readonly navigationService = inject(NavigationService);
    readonly routeService = inject(RouteService);
    readonly storageService = inject(StorageService);
    readonly localeService = inject(LocaleService);
    readonly trackingService = inject(TrackingService);
    readonly userService = inject(UserService);
    readonly countrySettingsService = inject(CountrySettingsService);
    readonly overlayService = inject(OverlayService);
    readonly cd = inject(ChangeDetectorRef);
    readonly environmentService = inject(EnvironmentService);

    readonly isDesktop = EnvironmentUtils.isDesktop;

    protected destroyed$ = new Subject<void>();

    get countrySettings() {
        return this.countrySettingsService.countrySettings;
    }
    get isAndroidApp() {
        return this.environmentService.isAndroidApp;
    }

    ngOnDestroy() {
        this.destroyed$.next();
        this.destroyed$.complete();
    }
}
