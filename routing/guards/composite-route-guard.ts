import { ActivatedRouteSnapshot, CanActivateFn, RouterStateSnapshot } from '@angular/router';

export const compositeRouteGuard = (guards: CanActivateFn[]) => {
    return [
        {
            canActivate: (next: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
                for (const guard of guards) {
                    const result = guard.call(this, next, state);
                    if (result === true) {
                        continue;
                    }

                    if (result instanceof Promise) {
                        throw new Error('Invalid return type: should be one of boolean, UrlTree or Observable');
                    }

                    return result;
                }

                return true;
            },
        }.canActivate,
    ];
};
