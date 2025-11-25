import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { DefaultRouteService } from 'routing/guards/default-route.service';
import { ResetPasswordData } from 'modules/reset-password/reset-password.component';
import { JwtUtils } from 'app/utils/jwt-utils';
import { SessionService } from 'app/services/session.service';

export const ResetPasswordRouteGuard = (_next: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    const sessionService = inject(SessionService);

    if (sessionService.isLoggedIn) {
        sessionService.cleanData(['countryCode']);
    }

    const defaultRouteService = inject(DefaultRouteService);
    const router = inject(Router);
    const urlTree = router.parseUrl(state.url);

    const tokenSegment = urlTree.root.children.primary.segments[1]?.path;
    const data = JwtUtils.parse<ResetPasswordData>(tokenSegment);

    if (!tokenSegment || !data) {
        return defaultRouteService.createDefaultRoute(state.url);
    }

    return true;
};
