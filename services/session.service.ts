import { AuthService, TempTokenInput } from 'app/services/api/auth.service';
import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DateFnsConfigurationService } from 'ngx-date-fns';
import { CountrySettingsService } from 'app/services/country-settings.service';
import { StorageService } from 'app/services/storage.service';
import { UserService } from 'app/services/user.service';
import { UserUpdatesService } from 'app/services/user-updates.service';
import { TrackingService } from 'app/services/tracking/tracking.service';
import { ApiInterceptor, ApiService } from 'app/services/api/api.service';
import { dateLanguages } from 'app/models/date-languages';
import { User } from 'app/models/api/user';
import { NavigationService } from 'app/services/navigation.service';
import { AppEventService } from 'app/services/event.service';
import { of, zip } from 'rxjs';
import { SettingsOverlayService } from 'app/services/overlay/settings-overlay.service';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { FeatureService } from 'app/services/feature.service';
import { PushNotificationService } from 'app/services/push-notification.service';
import { EnvironmentService } from 'app/services/environment.service';
import { CacheRouteReuseStrategy } from 'routing/route-reuse-strategy';
import { RouteType, noAuthRouteTypes } from 'routing/route-type';
import { CommonOverlayService } from 'app/services/overlay/common-overlay.service';
import { RouteService } from 'app/services/route.service';
import { RouteReuseStrategy } from '@angular/router';
import { CountryCode } from 'app/models/api/country';
import { CookieService } from 'app/services/cookie.service';
import { LocaleService } from 'app/services/locale.service';

@Injectable({
    providedIn: 'root',
})
export class SessionService {
    firstSession = false;
    get isLoggedIn() {
        return !!this.storageService.token && !!this.userService.authUser && !!this.countrySettingsService.countrySettings;
    }
    get isStarted() {
        return this._isStarted;
    }

    private readonly navigationService = inject(NavigationService);
    private readonly routeService = inject(RouteService);
    private readonly dateFnsConfig = inject(DateFnsConfigurationService);
    private readonly userService = inject(UserService);
    private readonly userUpdatesService = inject(UserUpdatesService);
    private readonly trackingService = inject(TrackingService);
    private readonly storageService = inject(StorageService);
    private readonly apiService = inject(ApiService);
    private readonly countrySettingsService = inject(CountrySettingsService);
    private readonly translateService = inject(TranslateService);
    private readonly authService = inject(AuthService);
    private readonly eventService = inject(AppEventService);
    private readonly overlayService = inject(SettingsOverlayService);
    private readonly featureService = inject(FeatureService);
    private readonly pushNotificationService = inject(PushNotificationService);
    private readonly environmentService = inject(EnvironmentService);
    private readonly commonOverlayService = inject(CommonOverlayService);
    private readonly routeReuseStrategy = inject(RouteReuseStrategy) as CacheRouteReuseStrategy;
    private readonly cookieService = inject(CookieService);
    private readonly localeService = inject(LocaleService);

    private _isStarted = false;

    constructor() {
        ApiInterceptor.onUnauthorized.subscribe(_ => {
            if (this.isLoggedIn || !noAuthRouteTypes.includes(this.routeService.routeType())) {
                this.signOut();
            }
        });

        if (this.isLoggedIn) {
            this.onAuthorizedUser();
        }
    }

    commonStart() {
        this._isStarted = true;
        this.storageService.searchListTracked = false;
        this.storageService.mapSearchTracked = false;
        this.storageService.combinedSearchTracked = false;

        this.featureService.initIfReady();
    }

    startWithTempToken(tokenInput: TempTokenInput) {
        return this.authService
            .getToken(tokenInput)
            .pipe(
                switchMap(res =>
                    this.startWithInitialData({ token: res.data.token, user: res.data.user, countryCode: tokenInput.countryCode }),
                ),
            );
    }

    startWithUserIdAndTokenCode(userId: string, tokenCode: string) {
        return this.authService.authenticate({ userId, tokenCode }).pipe(
            switchMap(response => {
                this.cookieService.setRegistrationLoginAuthTokenCookie(response.data.token);
                return this.startWithInitialData({ token: response.data.token, user: response.data.user });
            }),
            map(_ => true),
            catchError(_ => of(false)),
        );
    }

    startWithInitialData({ token, user, countryCode }: { token: string; user: User; countryCode?: CountryCode }) {
        if (countryCode) {
            this.storageService.countryCode = countryCode.toUpperCase() as Uppercase<CountryCode>;
        }
        this.userService.authUser = user;
        this.storageService.token = token;
        const { localeCode } = this.localeService.saveUserLocale(user);
        return zip(this.updateLanguageForLocale(localeCode), this.countrySettingsService.refreshCountrySettings()).pipe(
            tap(_ => this.onAuthorizedUser()),
        );
    }

    loadInitialData() {
        return zip(this.userService.refreshAuthUser(), this.countrySettingsService.refreshCountrySettings()).pipe(
            tap(res => {
                const { localeCode, hasChanged } = this.localeService.saveUserLocale(res[0].data);
                if (hasChanged) {
                    this.updateLanguageForLocale(localeCode).toPromise();
                }

                this.onAuthorizedUser();
            }),
        );
    }

    navigateToDefaultRoute(mergeQueryParams = false) {
        this.navigationService.navigate(RouteType.empty, undefined, mergeQueryParams ? { queryParamsHandling: 'merge' } : undefined);
    }

    onFirstSession() {
        this.firstSession = true;
        this.userUpdatesService.start();
        this.updateCouponAndDeleteCookie();

        setTimeout(() => this.commonOverlayService.openWelcomeOverlay(), 2000);
    }

    changeLanguage(localeCode: string, reloadOnFinish = false) {
        const { hasChanged } = this.localeService.saveUserLocale(localeCode);
        if (!hasChanged) {
            return;
        }

        if (reloadOnFinish) {
            this.navigationService.reload();
        } else {
            this.updateLanguageForLocale(localeCode).subscribe();
            this.routeReuseStrategy.clear();
        }
    }

    // Check and save the Coupon code
    private updateCouponAndDeleteCookie() {
        const couponCookieName = 'sitlyCouponCode';
        const couponCode = this.cookieService.getCookieValue(couponCookieName);
        if (couponCode) {
            this.userService
                .saveUser({
                    activeCouponCode: couponCode,
                })
                .subscribe(() => {
                    this.cookieService.deleteCookie(couponCookieName);
                    this.countrySettingsService.refreshCountrySettings().subscribe();
                });
        }
    }

    private onAuthorizedUser() {
        try {
            if (this.userService.authUser) {
                this.trackingService.trackUserLoaded(this.userService.authUser);
                this.featureService.initIfReady();
            }

            if (this.userService.authUser?.completed) {
                const trackUrl = this.storageService.trackUrl;
                if (trackUrl) {
                    this.trackingService.trackRegistration();
                    this.storageService.trackUrl = undefined;
                } else {
                    this.trackingService.trackLogin();
                }

                this.checkPrompts();
                this.userUpdatesService.start();
                if (this.environmentService.isAndroidApp) {
                    this.pushNotificationService.start();
                }

                this.eventService.processPostRefreshEvents();

                this.updateCouponAndDeleteCookie();
            }
        } catch (e) {
            console.log(e);
        }
    }

    private updateLanguageForLocale(localeCode: string) {
        const language = localeCode.substring(0, 2);
        this.dateFnsConfig.setLocale(dateLanguages[language]);
        return this.translateService.getTranslation(language).pipe(tap(_ => this.translateService.use(language)));
    }

    private checkPrompts() {
        this.checkReenabledPrompt();
        this.eventService.sendPromptCheckEvent();
    }

    private checkReenabledPrompt() {
        if (this.storageService.reEnabled) {
            this.storageService.reEnabled = false;
            this.commonOverlayService.showVisibleAgainOverlay();
        }
    }

    // ---- Sign out ----
    disableAccount(isQR = false) {
        this.trackingService.trackDisableAccount(isQR);
        this.userService.saveUser({ disabled: 1 }).subscribe(() => {
            this.cleanData();
            this.overlayService.showAccountHiddenOverlay(() => this.signOut());
        });
    }

    cleanData(extraKeptFields: string[] = []) {
        this.storageService.clearStorage(extraKeptFields);
        this.apiService.clearCache();
        this.trackingService.clearUser();
        this.routeReuseStrategy.clear();

        this.userUpdatesService.stop();
        this.pushNotificationService.stop();
    }

    signOut() {
        this._isStarted = false;
        this.cleanData();
        this.navigationService.exit(true);
    }
}
