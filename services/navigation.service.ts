import { EnvironmentUtils } from 'app/utils/device-utils';
import { Injectable, inject } from '@angular/core';
import { NavigationExtras, NavigationStart, Params, Router } from '@angular/router';
import { RouteType } from 'routing/route-type';
import { CountrySettingsService } from 'app/services/country-settings.service';
import { RegistrationSubRouteType } from 'registration/registration-route-type';
import { EnvironmentService } from 'app/services/environment.service';
import { AuthSubRouteType } from 'modules/auth//auth-route-type';
import { filter } from 'rxjs/operators';
import { RouteService } from 'app/services/route.service';
import { environment } from 'environments/environment';

type RouterCommandType = string | Record<string, string | number>;
@Injectable({
    providedIn: 'root',
})
export class NavigationService {
    get hasHistory() {
        return this.history.length > 1;
    }
    private get currentQueryParameters() {
        return Object.fromEntries(new URLSearchParams(window.location.search));
    }
    static readonly modalRoutes = [
        RouteType.premiumStart,
        RouteType.premiumPaymentMethods,
        RouteType.hidden,
        RouteType.addressChange,
        RouteType.recommendations,
        RouteType.facebookPhotos,
        RouteType.instagramPhotos,
    ];
    private history: string[] = [];
    private backStepsCount = 0;
    private readonly router = inject(Router);
    private readonly routeService = inject(RouteService);
    private readonly environmentService = inject(EnvironmentService);
    private readonly countrySettingsService = inject(CountrySettingsService);

    constructor() {
        this.router.events.pipe(filter(event => event instanceof NavigationStart)).subscribe(event => this.onNavigationStart(event));
    }

    // ---- History ---- //
    getPreviousUrl(skipSimilarUrls = true) {
        if (this.history.length < 2) {
            return undefined;
        }

        if (!skipSimilarUrls) {
            return this.history[this.history.length - 2];
        }

        const currentUrl = this.history[this.history.length - 1];
        for (let i = this.history.length - 2; i >= 0; i--) {
            if (!this.routeService.isSimilar(currentUrl, this.history[i])) {
                return this.history[i];
            }
        }
        return undefined;
    }

    clearHistory() {
        this.history = [];
    }

    reload() {
        window.location.reload();
    }

    appendQueryParam(queryParams: Params) {
        return this.router.navigate([], { queryParams, queryParamsHandling: 'merge', skipLocationChange: true });
    }

    removeQueryParam(param: string) {
        const queryParams: Params = {};
        queryParams[param] = null;
        this.router.navigate([], { queryParams, queryParamsHandling: 'merge' });
    }

    // ---- Navigate ---- //
    back(skipSimilarUrls?: boolean) {
        this.backStepsCount = skipSimilarUrls ? this.getSimilarUrlCount() : 1;
        if (this.routeService.hasModalRoute(this.history[this.history.length - 1]) && this.history.length === this.backStepsCount) {
            return this.closeModal();
        } else if (this.history.length === this.backStepsCount) {
            this.history = [];
            this.backStepsCount = 0;
            return this.navigate(RouteType.search, this.routeService.defaultSearchPath);
        }
        window.history.go(-1 * Math.min(this.backStepsCount, window.history.length - 1));
        return new Promise(resolve => setTimeout(() => resolve(true), 100));
    }

    closeModal() {
        return this.router.navigate([{ outlets: { modal: null } }]);
    }

    navigate(route: RouteType, fragments?: RouterCommandType | RouterCommandType[], extras?: NavigationExtras) {
        return this.router.navigateByUrl(this.createUrlTree(route, fragments, extras).toString());
    }

    navigateByUrl(url: string) {
        return this.router.navigateByUrl(url);
    }

    navigateToRegistrationStep(subRoute: RegistrationSubRouteType) {
        this.router.navigate([`${RouteType.complete}/${subRoute}`], { queryParamsHandling: 'merge' });
    }

    navigateToAuthScreen(subRoute: AuthSubRouteType, extras?: NavigationExtras) {
        return this.router.navigate([`${RouteType.auth}/${subRoute}`], extras);
    }

    exit(reloadOnFinish?: boolean) {
        const queryParams = this.currentQueryParameters;
        setTimeout(() => {
            const countryWebAppUrl = this.countrySettingsService.countrySettings?.countryWebAppUrl;
            if (this.environmentService.isAndroidApp || EnvironmentUtils.isLocalhost || environment.name === 'test' || !countryWebAppUrl) {
                this.navigateToAuthScreen(AuthSubRouteType.signIn, {
                    queryParams: { ...queryParams, tempToken: undefined },
                    queryParamsHandling: 'merge',
                }).then(_ => {
                    if (reloadOnFinish) {
                        this.reload();
                    }
                });
            } else {
                window.location.href = `${countryWebAppUrl}/logout`;
            }
        }, 0);
    }

    showPremium() {
        this.navigate(RouteType.premiumStart, undefined, { queryParamsHandling: 'merge' });
    }

    openChat(isAuthUserPremium: boolean, userId: string) {
        if (isAuthUserPremium) {
            this.navigate(RouteType.messages, [userId]);
        } else {
            this.showPremium();
        }
    }

    getSimilarUrlCount() {
        if (this.history.length < 2) {
            return this.history.length;
        }

        let result = 1;
        const currentUrl = this.history[this.history.length - 1];
        for (let i = this.history.length - 2; i >= 0; i--) {
            if (this.routeService.isSimilar(currentUrl, this.history[i])) {
                result++;
            } else {
                break;
            }
        }
        return result;
    }

    createUrlTree(route: RouteType, fragments?: RouterCommandType | RouterCommandType[], extras?: NavigationExtras) {
        const commands: RouterCommandType[] = route?.split('/') ?? [];
        if (fragments) {
            if (fragments instanceof Array) {
                commands.push(...fragments);
            } else {
                commands.push(fragments);
            }
        }

        if (NavigationService.modalRoutes.includes(route)) {
            return this.router.createUrlTree([{ outlets: { modal: commands } }], extras);
        } else {
            return this.router.createUrlTree(commands, extras);
        }
    }

    private onNavigationStart(event: NavigationStart) {
        if (event.url === this.history[this.history.length - 1]) {
            return;
        }

        if (this.backStepsCount > 0) {
            this.history.splice(this.history.length - this.backStepsCount);
            this.backStepsCount = 0;
        } else if (event.navigationTrigger === 'popstate') {
            this.history.pop();
        } else if (event.navigationTrigger === 'imperative') {
            this.history.push(event.url);
        }
    }
}
