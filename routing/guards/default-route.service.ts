import { Injectable, inject } from '@angular/core';
import { NavigationExtras, Router } from '@angular/router';
import { NavigationService } from 'app/services/navigation.service';
import { SessionService } from 'app/services/session.service';
import { UserService } from 'app/services/user.service';
import { RouteType } from 'routing/route-type';
import { AuthSubRouteType } from 'modules/auth/auth-route-type';
import { RouteService } from 'app/services/route.service';

@Injectable({
    providedIn: 'root',
})
export class DefaultRouteService {
    private readonly navigationService = inject(NavigationService);
    private readonly routeService = inject(RouteService);
    private readonly sessionService = inject(SessionService);
    private readonly userService = inject(UserService);
    private readonly router = inject(Router);

    createDefaultRoute(url: string, keepQueryParameters = true) {
        const urlTree = this.router.parseUrl(url);
        const queryParams = urlTree.queryParams;

        const extras = keepQueryParameters
            ? ({
                  queryParams,
                  queryParamsHandling: 'merge',
              } as NavigationExtras)
            : undefined;

        if (!this.sessionService.isLoggedIn || !this.userService.authUser) {
            this.sessionService.cleanData();
            return this.navigationService.createUrlTree(RouteType.auth, AuthSubRouteType.signIn, extras);
        } else {
            const resultTree = this.userService.authUser.completed
                ? this.routeForCompletedUser(extras)
                : this.navigationService.createUrlTree(RouteType.complete, undefined, extras);

            return resultTree;
        }
    }

    private routeForCompletedUser(extras?: NavigationExtras) {
        return this.navigationService.createUrlTree(RouteType.search, this.routeService.defaultSearchPath, extras);
    }
}
