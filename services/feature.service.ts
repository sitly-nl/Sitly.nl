import { Injectable, inject } from '@angular/core';
import { FeatureDefinition, GrowthBook } from '@growthbook/growthbook';
import { User } from 'app/models/api/user';
import { EnvironmentUtils } from 'app/utils/device-utils';
import { CountrySettingsService } from 'app/services/country-settings.service';
import { TrackingService } from 'app/services/tracking/tracking.service';
import { UserService } from 'app/services/user.service';
import { environment } from 'environments/environment';
import { CountryCode } from 'app/models/api/country';

export enum FeatureId {
    placeholder = '000-placeholder',
}

export type AppFeatures = Record<FeatureId, FeatureDefinition<boolean>>;

@Injectable({
    providedIn: 'root',
})
export class FeatureService {
    private readonly trackingService = inject(TrackingService);
    private readonly userService = inject(UserService);
    private readonly countrySettingsService = inject(CountrySettingsService);
    private growthbook?: GrowthBook;

    get invitesEnabled() {
        return !!this.countrySettingsService.countrySettings?.invitesDailyLimit;
    }
    get showPremiumLabel() {
        return this.userService.authUser?.isPremium || this.userService.authUser?.isParent || !this.invitesEnabled;
    }
    get showPremiumOverlayNewDesign() {
        return !this.invitesEnabled && !this.userService.authUser?.aTestVersion;
    }

    constructor() {
        this.userService.changed.subscribe(_ => {
            const gb = this.growthbook;
            const countryCode = this.countrySettingsService.countrySettings?.countryCode;
            if (this.userService.authUser && gb && countryCode) {
                gb.setAttributes({
                    ...gb.getAttributes(),
                    ...this.getUserAttributes(this.userService.authUser, countryCode),
                });
            }
        });
    }

    initIfReady() {
        if (this.growthbook || !this.userService.authUser || !this.countrySettingsService.countrySettings) {
            return;
        }

        const countryCode = this.countrySettingsService.countrySettings.countryCode;
        const attributes = {
            brandCode: countryCode,
            deviceCategory: EnvironmentUtils.isDesktop() ? 'desktop' : 'mobile',
            env: environment.name,
            url: window.location.href,
            browser: navigator.userAgent,
            ...this.getUserAttributes(this.userService.authUser, countryCode),
        };
        this.growthbook = new GrowthBook<AppFeatures>({
            enableDevMode: environment.name !== 'production',
            attributes,
            features: this.countrySettingsService.countrySettings?.webAppFeatures,
            trackingCallback: (experiment, result) => {
                this.trackingService.trackExperimentViewed(experiment.key, result.variationId);
            },
        });
    }

    isOn(featureId: FeatureId) {
        return this.growthbook?.isOn(featureId) ?? false;
    }

    getFeature(featureId: FeatureId) {
        return this.growthbook?.getFeatureValue(featureId, {});
    }

    private getUserAttributes(user: User, countryCode: CountryCode) {
        return {
            id: `${countryCode}.${user.id}`,
            // use to trigger different test variants
            // id: `${brandCode}.${Math.random().toString(36).substring(2, 7)}`,
            locale: user.localeCode,
            isSitlyAccount: user.isSitlyAccount,
            userRole: user.role,
            loggedIn: !!user.completed,
            isPremium: user.isPremium,
            isWinbackUser: !!user.discountPercentage,
        };
    }
}
