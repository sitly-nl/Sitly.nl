import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { DefaultRouteService } from 'routing/guards/default-route.service';
import { JwtUtils } from 'app/utils/jwt-utils';
import { RecommendationData } from 'modules/post-recommendation/post-recommendation.component';
import { StorageService } from 'app/services/storage.service';

export const PostRecommendationRouteGuard = (_next: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    const storageService = inject(StorageService);
    const defaultRouteService = inject(DefaultRouteService);
    const router = inject(Router);
    const urlTree = router.parseUrl(state.url);

    const recommendationData = JwtUtils.parse<RecommendationData>(urlTree.queryParams.token as string);

    if (!urlTree.queryParams.token || !recommendationData || !storageService.countryCode) {
        return defaultRouteService.createDefaultRoute(state.url);
    }

    return true;
};
