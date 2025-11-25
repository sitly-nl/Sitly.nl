import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { SessionService } from 'app/services/session.service';
import { StorageService } from 'app/services/storage.service';

export const StoredQueryParamsGuard = (_next: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    const storageService = inject(StorageService);
    const sessionService = inject(SessionService);
    const router = inject(Router);
    const url = state.url;

    const urlTree = router.parseUrl(url);
    let needsToChangeUrl = false;
    storageService.fieldsPopulatedFromQueryParams.forEach(field => {
        let value = urlTree.queryParams[field] as string | undefined;
        if (value) {
            if (field === 'countryCode') {
                value = value.toUpperCase();
                if (storageService.countryCode && storageService.countryCode !== value) {
                    sessionService.cleanData();
                }
            }
            storageService[field] = value as never;
            needsToChangeUrl = true;
            delete urlTree.queryParams[field];
        }
    });

    if (needsToChangeUrl) {
        return urlTree;
    }

    return true;
};
