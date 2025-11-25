import { ElementRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { RouteService } from 'app/services/route.service';
import { RouteType } from 'routing/route-type';
import { filter } from 'rxjs/operators';

export interface ScrollContainerHost {
    scrollContainer?: ElementRef<HTMLDivElement | undefined>;
}

export class RestoreScrollPositionService {
    private readonly router = inject(Router);
    private readonly routeService = inject(RouteService);
    private lastScrollPosition = 0;

    constructor(routeType: RouteType, host: ScrollContainerHost, onOtherRouteAction?: () => void) {
        this.router.events
            .pipe(
                takeUntilDestroyed(),
                filter(event => event instanceof NavigationEnd),
            )
            .subscribe(event => {
                if (this.routeService.getRouteType(event.url) === routeType) {
                    host.scrollContainer?.nativeElement?.scroll({
                        behavior: 'instant',
                        top: this.lastScrollPosition,
                    });
                } else {
                    this.lastScrollPosition = host.scrollContainer?.nativeElement?.scrollTop ?? 0;
                    onOtherRouteAction?.();
                }
            });
    }
}
