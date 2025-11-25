import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { SessionService } from 'app/services/session.service';
import { UserService } from 'app/services/user.service';
import { RouteType } from 'routing/route-type';
import { FeatureService } from 'app/services/feature.service';
import { DefaultRouteService } from 'routing/guards/default-route.service';
import { RouteService } from 'app/services/route.service';

export const GenericRouteGuard = (next: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    const routeService = inject(RouteService);
    const sessionService = inject(SessionService);
    const featureService = inject(FeatureService);
    const userService = inject(UserService);
    const defaultRouteService = inject(DefaultRouteService);
    const router = inject(Router);

    const routeType = routeService.getRouteType(state.url);
    if (routeType === RouteType.invites && !featureService.invitesEnabled) {
        return defaultRouteService.createDefaultRoute(state.url);
    }

    // do not allow premium route path for premium users
    if (next.outlet === 'modal' && next.routeConfig?.path === 'premium') {
        if (!userService.authUser?.isPremium || next.queryParamMap.get('status') === 'PAID') {
            return true;
        } else {
            return inject(Router).parseUrl(state.url.substring(0, state.url.indexOf('(')));
        }
    }

    if (state.url === '/' || state.url.startsWith('/?') || (state.url.startsWith('/#_=_') && sessionService.isLoggedIn)) {
        return defaultRouteService.createDefaultRoute(state.url);
    }

    const urlTree = router.parseUrl(state.url);
    const segments = urlTree.root.children.primary.segments;
    if (segments.pop()?.path === RouteType.search) {
        // checks if no proper search sub-path is provided
        return defaultRouteService.createDefaultRoute(state.url);
    }

    if (!sessionService.isStarted) {
        sessionService.commonStart();
    }

    return sessionService.isLoggedIn;
};
