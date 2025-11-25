import { BaseComponent } from 'app/components/base.component';
import { Component, ChangeDetectionStrategy, OnInit, inject, computed, ViewChild, ElementRef, signal, effect } from '@angular/core';
import { RouterLinkActive, RouterLink } from '@angular/router';
import { UtilService } from 'app/services/util.service';
import { UserUpdatesService } from 'app/services/user-updates.service';
import { takeUntil } from 'rxjs/operators';
import { EventAction } from 'app/services/tracking/types';
import { RouteType } from 'routing/route-type';
import { FeatureService } from 'app/services/feature.service';
import { InvitesTooltipService } from 'app/services/tooltip/invites-tooltip.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'footer-menu',
    templateUrl: 'footer-menu.component.html',
    styleUrls: ['footer-menu.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [RouterLinkActive, RouterLink, TranslateModule],
})
export class FooterMenuComponent extends BaseComponent implements OnInit {
    @ViewChild('componentContainer') containerRef?: ElementRef<HTMLElement>;
    @ViewChild('invitesBtn') invitesRef?: ElementRef<HTMLElement>;

    EventAction = EventAction;

    readonly isSearchTabActive = computed(() => this.routeService.routeType() === RouteType.search);
    readonly isProfileTabActive = computed(
        () => this.routeService.routeType() === RouteType.settings || this.routeService.routeType() === RouteType.account,
    );

    readonly unreadMessagesCount = computed(() => this.userUpdatesService.messagesCount());
    readonly unreadInvitesCount = computed(() => this.userUpdatesService.invitesCount());
    readonly invitesEnabled = signal(false);

    private readonly invitesTooltipService = inject(InvitesTooltipService);
    private readonly userUpdatesService = inject(UserUpdatesService);
    private readonly util = inject(UtilService);
    private readonly featureService = inject(FeatureService);

    constructor() {
        super();
        effect(() => {
            if (this.userUpdatesService.invitesCount() > 0) {
                this.invitesTooltipService.showParentInvitesTooltipIfNeeded('top', this.invitesRef, this.containerRef);
            }
        });
    }

    ngOnInit() {
        this.invitesEnabled.set(this.featureService.invitesEnabled);
        this.userService.changed.pipe(takeUntil(this.destroyed$)).subscribe(() => {
            this.util.delay(() => {
                this.cd.markForCheck();
            }, 500);
        });
    }
}
