import { Injectable, OnDestroy, inject } from '@angular/core';
import { CountrySettings } from 'app/models/api/country-settings-interface';
import { SubscriptionInterface } from 'app/models/api/subscription';
import { CountrySettingsService } from 'app/services/country-settings.service';
import { StorageService } from 'app/services/storage.service';
import { TrackingService } from 'app/services/tracking/tracking.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Injectable({
    providedIn: 'root',
})
export class PremiumService implements OnDestroy {
    private readonly countrySettingsService = inject(CountrySettingsService);
    private readonly trackingService = inject(TrackingService);
    private readonly storageService = inject(StorageService);

    changed$ = new Subject<void>();

    subscription: SubscriptionInterface;
    // TODO: seems it is not used
    subscriptions: SubscriptionInterface[] = [];

    private destroyed$ = new Subject<void>();

    start(countrySettings: CountrySettings) {
        this.countrySettingsService.changed.pipe(takeUntil(this.destroyed$)).subscribe(value => {
            this.onCountrySettingsReady(value);
        });

        if (this.storageService.subscription) {
            this.subscription = this.storageService.subscription;
        }

        this.onCountrySettingsReady(countrySettings);
    }

    selectSubscription(subscription: SubscriptionInterface) {
        this.storageService.subscription = subscription;
        this.subscription = subscription;
    }

    ngOnDestroy() {
        this.destroyed$.next();
        this.destroyed$.complete();
    }

    private onCountrySettingsReady(countrySettings: CountrySettings) {
        // permanent
        if (countrySettings.abPricingTestParents) {
            this.trackingService.setExperiment(countrySettings.abPricingTestParents);
        }
        if (countrySettings.abPricingTestBabysitters) {
            this.trackingService.setExperiment(countrySettings.abPricingTestBabysitters);
        }

        if (countrySettings.subscriptions?.length > 0) {
            this.subscriptions = countrySettings.subscriptions.sort((a, b) => {
                return a.duration - b.duration;
            });
        }

        this.changed$.next();
    }
}
