import { Component, ChangeDetectionStrategy, OnInit, inject, computed, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { BaseComponent } from 'app/components/base.component';
import { SessionService } from 'app/services/session.service';
import { routesAnimation } from 'routing/animations';
import { RouteType } from 'routing/route-type';
import { takeUntil } from 'rxjs/operators';
import { OverlayTestService } from 'app/services/overlay/overlay-test.service';
import { EnvironmentUtils } from 'app/utils/device-utils';
import { HeaderMenuComponent } from 'app/components/header-menu/header-menu.component';
import { FooterMenuComponent } from 'app/components/footer-menu/footer-menu.component';
import { PromptHostComponent } from 'app/components/prompt/prompt-host.component';
import { RestorePremiumComponent } from 'app/components/premium/restore-premium/restore-premium.component';
import { setTag } from '@sentry/angular';

@Component({
    selector: 'app',
    templateUrl: 'app.component.html',
    styleUrls: ['./app.component.less'],
    animations: [routesAnimation],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [HeaderMenuComponent, RouterOutlet, FooterMenuComponent, PromptHostComponent, RestorePremiumComponent],
})
export class AppComponent extends BaseComponent implements OnInit {
    private readonly titleService = inject(Title);
    private readonly sessionService = inject(SessionService);

    readonly hasModalRoute = computed(() => this.routeService.hasModalRoute(this.routeService.currentUrl()));
    readonly showFooter = computed(() => {
        const routeType = this.routeService.routeType();

        return (
            this.sessionService.isLoggedIn &&
            !this.isDesktop() &&
            [RouteType.favorites, RouteType.search, RouteType.messages, RouteType.settings, RouteType.account, RouteType.invites].includes(
                routeType,
            )
        );
    });
    readonly showHeader = computed(() => {
        const routeType = this.routeService.routeType();
        return (
            this.isDesktop() &&
            this.sessionService.isLoggedIn &&
            this.authUser.completed &&
            routeType !== RouteType.empty &&
            routeType !== RouteType.postRecommendation
        );
    });

    constructor() {
        super();
        if (window.Cypress) {
            window.overlayTestService = new OverlayTestService();
        }
    }

    @HostListener('window:resize')
    onResize() {
        EnvironmentUtils.onResize();
    }

    ngOnInit() {
        this.titleService.setTitle('Sitly');

        if (window.document.referrer.startsWith('android-app')) {
            sessionStorage.setItem('android-app', 'true');
        }

        this.userService.changed.pipe(takeUntil(this.destroyed$)).subscribe(_ => this.cd.markForCheck());
        setTag('platform', this.environmentService.trackingPlatform);
    }

    prepareRoute(outlet: RouterOutlet) {
        return outlet?.activatedRouteData?.animation as unknown;
    }
}
