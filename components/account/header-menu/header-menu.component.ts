import { BaseComponent } from 'app/components/base.component';
import {
    Component,
    OnInit,
    ChangeDetectionStrategy,
    inject,
    computed,
    signal,
    ViewChild,
    ElementRef,
    EventEmitter,
    effect,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { UtilService } from 'app/services/util.service';
import { UserUpdatesService } from 'app/services/user-updates.service';
import { takeUntil } from 'rxjs/operators';
import { RouteType } from 'routing/route-type';
import { FeatureService } from 'app/services/feature.service';
import { InvitesTooltipService } from 'app/services/tooltip/invites-tooltip.service';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';

@Component({
    selector: 'header-menu',
    templateUrl: './header-menu.component.html',
    styleUrls: ['./header-menu.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [RouterLink, SharedModule, TranslateModule],
})
export class HeaderMenuComponent extends BaseComponent implements OnInit {
    @ViewChild('invitesBtn') invitesRef?: ElementRef<HTMLElement>;

    readonly additionalMenuVisible = signal(false);
    readonly isMessagesTabActive = computed(
        () => this.routeService.routeType() === RouteType.messages || this.routeService.routeType() === RouteType.chat,
    );
    readonly isFavoritesTabActive = computed(() => this.routeService.routeType() === RouteType.favorites);
    readonly isInvitesTabActive = computed(() => this.routeService.routeType() === RouteType.invites);
    readonly isSearchTabActive = computed(() => this.routeService.routeType() === RouteType.search);
    readonly unreadMessagesCount = computed(() => this.userUpdatesService.messagesCount());
    readonly unreadInvitesCount = computed(() => this.userUpdatesService.invitesCount());
    readonly invitesEnabled = signal(false);

    private readonly featureService = inject(FeatureService);
    private readonly userUpdatesService = inject(UserUpdatesService);
    private readonly invitesTooltipService = inject(InvitesTooltipService);
    private readonly router = inject(Router);
    private readonly util = inject(UtilService);
    private readonly hostElementRef = inject(ElementRef);
    private readonly positionChanged = new EventEmitter();

    constructor() {
        super();
        effect(() => {
            if (this.userUpdatesService.invitesCount() > 0) {
                this.invitesTooltipService.showParentInvitesTooltipIfNeeded(
                    'bottom',
                    this.invitesRef,
                    this.hostElementRef,
                    this.positionChanged,
                );
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

        this.router.events.pipe(takeUntil(this.destroyed$)).subscribe(event => {
            if (event instanceof NavigationEnd) {
                this.additionalMenuVisible.set(false);
            }
        });
    }

    ngAfterViewChecked() {
        if (this.authUser.isParent && (this.invitesRef?.nativeElement?.clientWidth ?? 0) > 0) {
            this.positionChanged.next();
        }
    }
}
