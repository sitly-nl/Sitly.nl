import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { SessionService } from 'app/services/session.service';
import { UserService } from 'app/services/user.service';
import { noAuthRouteTypes } from 'routing/route-type';
import { DefaultRouteService } from 'routing/guards/default-route.service';
import { RouteService } from 'app/services/route.service';

export const NoAuthRouteGuard = (_next: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    const routeService = inject(RouteService);
    const sessionService = inject(SessionService);
    const userService = inject(UserService);
    const defaultRouteService = inject(DefaultRouteService);

    const routeType = routeService.getRouteType(state.url);
    if (noAuthRouteTypes.includes(routeType) && routeType.startsWith('auth') && userService.authUser && sessionService.isLoggedIn) {
        return defaultRouteService.createDefaultRoute(state.url);
    }

    return true;
};
