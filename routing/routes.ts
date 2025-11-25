import { RouteType } from 'routing/route-type';
import { Routes, RouterModule, Route, LoadChildrenCallback, CanActivateFn, DefaultExport } from '@angular/router';
import { PageNotFoundComponent } from 'app/components/page-not-found/page-not-found.component';
import { Component, NgModule, Type } from '@angular/core';
import { StoredQueryParamsGuard } from 'routing/guards/stored-query-params-guard';
import { NoAuthRouteGuard } from 'routing/guards/no-auth-route-guard';
import { GenericRouteGuard } from 'routing/guards/generic-route-guard';
import { AuthRouteGuard } from 'routing/guards/auth-route-guard';
import { ResetPasswordRouteGuard } from 'routing/guards/reset-password-route-guard';
import { PostRecommendationRouteGuard } from 'routing/guards/post-recommendation-route-guard';
import { compositeRouteGuard } from 'routing/guards/composite-route-guard';
import { NavigationService } from 'app/services/navigation.service';

export const defaultRouteGuards = compositeRouteGuard([StoredQueryParamsGuard, AuthRouteGuard, GenericRouteGuard]);

export const lazyLoadStandaloneRoute = (
    type: RouteType | { path: string; type: RouteType },
    loadComponent: () => Promise<DefaultExport<Type<unknown>>>,
    canActivate = defaultRouteGuards,
) => {
    const routeType = typeof type === 'string' ? type : type.type;
    return {
        path: typeof type === 'string' ? type : type.path,
        runGuardsAndResolvers: 'always',
        canActivate,
        outlet: NavigationService.modalRoutes.includes(routeType) ? 'modal' : undefined,
        loadComponent,
    } as Route;
};

export const lazyLoadRoute = (
    type: RouteType | string | { path: string; type: RouteType },
    loadChildren: LoadChildrenCallback,
    modal = false,
    canActivate?: CanActivateFn[],
) => {
    return {
        path: typeof type === 'string' ? type : type.path,
        runGuardsAndResolvers: 'always',
        canActivate: canActivate ?? defaultRouteGuards,
        outlet: modal ? 'modal' : undefined,
        data: { animation: typeof type === 'string' ? type : type.type },
        loadChildren,
    } as Route;
};

@Component({ selector: 'empty-web-app', template: '' })
class EmptyComponent {}

const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        component: EmptyComponent,
        canActivate: defaultRouteGuards,
    },

    lazyLoadStandaloneRoute(
        { type: RouteType.resetPassword, path: 'reset-password/:token' },
        () => import('modules/reset-password/reset-password.component'),
        compositeRouteGuard([StoredQueryParamsGuard, ResetPasswordRouteGuard]),
    ),
    lazyLoadStandaloneRoute(RouteType.instagram, () => import('modules/instagram-auth-callback.component')),
    lazyLoadStandaloneRoute(RouteType.instagramPhotos, () => import('modules/instagram-photos/instagram-photos.component')),

    lazyLoadRoute(
        RouteType.auth,
        () => import('modules/auth/auth.module'),
        false,
        compositeRouteGuard([StoredQueryParamsGuard, NoAuthRouteGuard]),
    ),
    lazyLoadRoute(RouteType.complete, () => import('registration/registration.module'), false, [StoredQueryParamsGuard]),
    lazyLoadRoute(
        { type: RouteType.postRecommendation, path: 'post-recommendation/:userId' },
        () => import('modules/post-recommendation/post-recommendation.module'),
        false,
        compositeRouteGuard([StoredQueryParamsGuard, PostRecommendationRouteGuard]),
    ),
    lazyLoadRoute(RouteType.facebookPhotos, () => import('modules/facebook/facebook.module'), true),
    { path: '', canActivate: defaultRouteGuards, loadChildren: () => import('app/app.module') },
    { path: '**', component: PageNotFoundComponent },
];

@NgModule({
    imports: [RouterModule.forRoot(routes, { bindToComponentInputs: true })],
    exports: [RouterModule],
})
export class AppRoutingModule {}
