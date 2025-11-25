import { ComponentRef } from '@angular/core';
import { DetachedRouteHandle, ActivatedRouteSnapshot, BaseRouteReuseStrategy } from '@angular/router';
import { RouteType } from 'routing/route-type';

export class CacheRouteReuseStrategy extends BaseRouteReuseStrategy {
    private storedRouteHandles = new Map<RouteType, DetachedRouteHandle>();
    private cachingRouteTypes = [RouteType.search, RouteType.invites];

    clear() {
        // To actually destroy component
        this.storedRouteHandles.forEach(handle => this.destroyComponentRef(handle));
        this.storedRouteHandles.clear();
    }

    clearRouteCache(route: RouteType) {
        const handle = this.storedRouteHandles.get(route);
        if (handle) {
            this.destroyComponentRef(handle);
            this.storedRouteHandles.delete(route);
        }
    }

    retrieve(route: ActivatedRouteSnapshot) {
        return (route.component && this.storedRouteHandles.get(route.data.routeType as never)) ?? null;
    }

    shouldAttach(route: ActivatedRouteSnapshot) {
        return this.cachingRouteTypes.includes(route.data.routeType as never) && this.storedRouteHandles.has(route.data.routeType as never);
    }

    shouldDetach(route: ActivatedRouteSnapshot) {
        return !!route.component && this.cachingRouteTypes.includes(route.data.routeType as never);
    }

    store(route: ActivatedRouteSnapshot, detachedTree: DetachedRouteHandle | null) {
        if (route.data.routeType) {
            if (detachedTree) {
                this.storedRouteHandles.set(route.data.routeType as never, detachedTree);
            } else {
                this.storedRouteHandles.delete(route.data.routeType as never);
            }
        }
    }

    private destroyComponentRef(handle: DetachedRouteHandle) {
        if ('componentRef' in handle) {
            (handle.componentRef as ComponentRef<unknown>).destroy();
        }
    }
}
