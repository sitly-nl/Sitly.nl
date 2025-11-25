import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { noAuthRouteTypes } from '../route-type';
import { SessionService } from 'app/services/session.service';
import { TempTokenInput } from 'app/services/api/auth.service';
import { JwtUtils } from 'app/utils/jwt-utils';
import { StorageService } from 'app/services/storage.service';
import { map } from 'rxjs/operators';
import { DefaultRouteService } from 'routing/guards/default-route.service';
import { RouteService } from 'app/services/route.service';
import { CountryCode } from 'app/models/api/country';

export const AuthRouteGuard = (_next: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    const sessionService = inject(SessionService);
    const routeService = inject(RouteService);
    const storageService = inject(StorageService);
    const router = inject(Router);
    const defaultRouteService = inject(DefaultRouteService);

    const urlTree = router.parseUrl(state.url);

    let tempTokenInput: TempTokenInput | undefined;
    const tempToken = urlTree.queryParams.tempToken as string;
    if (tempToken) {
        const tokenData = JwtUtils.parse<{ data: { brandCode?: CountryCode } }>(tempToken)?.data;
        if (tokenData?.brandCode) {
            tempTokenInput = { token: tempToken, countryCode: tokenData?.brandCode };
        }
        delete urlTree.queryParams.tempToken;
    }

    const url = router.serializeUrl(urlTree);

    if (
        !noAuthRouteTypes.includes(routeService.getRouteType(url)) &&
        !url.startsWith('/complete/start') &&
        (!sessionService.isLoggedIn || tempTokenInput)
    ) {
        storageService.token = storageService.token ?? (urlTree.queryParams?.authToken as never);

        const canBeAuthenticated = (storageService.token && storageService.countryCode) || tempTokenInput;

        if (!sessionService.isLoggedIn && !canBeAuthenticated) {
            sessionService.cleanData();
            return defaultRouteService.createDefaultRoute(url);
        }

        if (tempTokenInput) {
            sessionService.cleanData();
            return sessionService
                .startWithTempToken(tempTokenInput)
                .pipe(proceedAfterLogin(url, router, sessionService, defaultRouteService));
        } else {
            // load user first and then redirect to requested url
            return sessionService.loadInitialData().pipe(proceedAfterLogin(url, router, sessionService, defaultRouteService));
        }
    }

    return true;
};

const proceedAfterLogin = (url: string, router: Router, sessionService: SessionService, defaultRouteService: DefaultRouteService) =>
    map(_ => {
        const decodedUrl = decodeURIComponent(url);
        if (sessionService.isLoggedIn) {
            return router.parseUrl(decodedUrl);
        } else {
            sessionService.cleanData();
            return defaultRouteService.createDefaultRoute(decodedUrl);
        }
    });
