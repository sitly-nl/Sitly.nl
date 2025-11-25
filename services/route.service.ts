import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { EnvironmentUtils } from 'app/utils/device-utils';
import { RouteType, allRouteTypes } from 'routing/route-type';
import { filter } from 'rxjs/operators';

@Injectable({
    providedIn: 'root',
})
export class RouteService {
    readonly currentUrl = computed(() => this.navigationEndEvents()?.urlAfterRedirects ?? '/');
    readonly routeType = computed(() => this.getRouteType(this.currentUrl()));
    readonly currentBaseRouteType = computed(() => {
        const urlTree = this.router.parseUrl(this.currentUrl());
        return this.getRouteType(urlTree.root?.children?.primary?.segments?.[0]?.path);
    });

    get isRootRoute() {
        return this.isRootUrl(this.router.url);
    }
    get defaultSearchPath() {
        return EnvironmentUtils.isDesktop() ? 'photo-and-map' : 'photo';
    }

    private readonly router = inject(Router);
    private readonly navigationEndEvents = toSignal(this.router.events.pipe(filter(event => event instanceof NavigationEnd)));

    getRouteType(url?: string) {
        if (!url || url === '/') {
            return RouteType.empty;
        }

        const modalRouteType = this.getModalRouteType(url);
        if (modalRouteType && allRouteTypes.includes(modalRouteType)) {
            return modalRouteType;
        }

        if (this.isRoute(url, '/messages/')) {
            return RouteType.chat;
        }
        if (this.isRoute(url, '/facebook-photos')) {
            return RouteType.facebookPhotos;
        }

        const path = url.split(/[?;#]/)[0].split('/')[1] as RouteType;
        return allRouteTypes.includes(path) ? path : RouteType.search;
    }

    hasModalRoute(url?: string) {
        const urlTree = this.router.parseUrl(url ?? this.router.url);
        return !!urlTree?.root?.children?.modal;
    }

    isSimilar(url: string, urlToCompare: string) {
        if (this.hasModalRoute(url)) {
            return this.hasModalRoute(urlToCompare);
        }

        return this.getRouteType(url) === this.getRouteType(urlToCompare);
    }

    // check if url belongs to routePath type of routes
    private isRoute(url: string, routePath: string) {
        return url?.startsWith(routePath);
    }

    private isRootUrl(url: string) {
        if (this.hasModalRoute(url)) {
            return false;
        }
        const routeType = this.getRouteType(url);
        if (routeType === RouteType.search || routeType === RouteType.favorites || routeType === RouteType.messages) {
            return true;
        }
        if (!EnvironmentUtils.isDesktop()) {
            return routeType === RouteType.settings;
        }
        return false;
    }

    private getModalRouteType(url: string) {
        const segments = this.router.parseUrl(url).root?.children?.modal?.segments;
        return segments?.map(segment => segment.path).join('/') as RouteType;
    }
}
