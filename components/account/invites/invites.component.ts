import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { BaseComponent } from 'app/components/base.component';
import { ConnectionInvite } from 'app/models/api/connection-invite';
import { CacheRouteReuseStrategy } from 'routing/route-reuse-strategy';
import { RouteType } from 'routing/route-type';
import { ConnectionInviteApiService } from 'app/services/api/connection-invite.api.service';
import { RestoreScrollPositionService } from 'app/services/ui/restore-scroll-position.service';
import { TranslateModule } from '@ngx-translate/core';
import { InfiniteScrollDirective } from 'ngx-infinite-scroll';
import { RouteReuseStrategy, RouterLink } from '@angular/router';
import { SharedModule } from 'modules/shared/shared.module';
import { NgTemplateOutlet } from '@angular/common';
import { UserCardComponent } from 'app/components/user/user-card/user-card.component';
import { differenceInHours, differenceInMinutes } from 'date-fns';
import { TypeformService } from 'app/services/typeform.service';
import { UserCardBlurredComponent } from 'app/components/user/user-card-blurred/user-card-blurred.component';
import { AppEventService, AppEventType } from 'app/services/event.service';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector: 'invites',
    templateUrl: './invites.component.html',
    styleUrls: ['./invites.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        SharedModule,
        NgTemplateOutlet,
        RouterLink,
        InfiniteScrollDirective,
        UserCardComponent,
        UserCardBlurredComponent,
        TranslateModule,
    ],
})
export class InvitesComponent extends BaseComponent implements OnInit {
    readonly loading = signal(true);
    readonly invites = signal<ConnectionInvite[]>([]);
    readonly invitesNoteShown = signal(!this.storageService.invitesNoteHidden);
    readonly restoreScrollPositionService = new RestoreScrollPositionService(RouteType.invites, this, () => {
        if (this.routeService.routeType() !== RouteType.users) {
            this.routeReuseStrategy.clearRouteCache(RouteType.invites);
        }
    });
    get showBTestVersion() {
        return this.authUser.isParent && !this.authUser.isPremium && !this.authUser.aTestVersion;
    }
    get receivedInvites() {
        return this.authUser.isParent;
    }
    private get showParentInviteSurvey() {
        return (
            this.storageService.fifthInviteViewedTime &&
            (differenceInHours(new Date(), this.storageService.fifthInviteViewedTime) >= 24 ||
                (this.authUser.isSitlyAccount && differenceInMinutes(new Date(), this.storageService.fifthInviteViewedTime) >= 2))
        );
    }
    private get showSitterInviteSurvey() {
        return (
            this.storageService.fifthInviteSentTime &&
            (differenceInHours(new Date(), this.storageService.fifthInviteSentTime) >= 24 ||
                (this.authUser.isSitlyAccount && differenceInMinutes(new Date(), this.storageService.fifthInviteSentTime) >= 2))
        );
    }

    private readonly typeformSurveyService = inject(TypeformService);
    private readonly inviteService = inject(ConnectionInviteApiService);
    private readonly eventService = inject(AppEventService);
    private readonly routeReuseStrategy = inject(RouteReuseStrategy) as CacheRouteReuseStrategy;
    private currentPage = 1;
    private readonly pageSize = 20;
    private startDate = new Date();

    @ViewChild('invitesContainer', { static: false }) scrollContainer?: ElementRef<HTMLDivElement | undefined>;

    ngOnInit() {
        this.loadInvites();

        if (
            !this.storageService.invitesSurveyShown &&
            ((this.authUser.isParent && this.showParentInviteSurvey) || (!this.authUser.isParent && this.showSitterInviteSurvey))
        ) {
            setTimeout(() => {
                this.typeformSurveyService.openSurvey('invites');
                this.storageService.invitesSurveyShown = true;
            }, 5_000);
        }

        this.eventService.events.pipe(takeUntil(this.destroyed$)).subscribe(event => {
            if (
                event.type === AppEventType.paymentComplete &&
                this.authUser.isParent &&
                !this.authUser.aTestVersion &&
                this.storageService.lastClickedInviteUserId
            ) {
                this.invites().forEach((item, index) => {
                    if (item.contactUser.id === this.storageService.lastClickedInviteUserId) {
                        this.markAsViewed(item, index);
                    }
                });
                this.navigationService.navigateByUrl(`${RouteType.users}/${this.storageService.lastClickedInviteUserId}`);
            }

            this.storageService.lastClickedInviteUserId = undefined;
            this.cd.markForCheck();
        });
    }

    hideNote() {
        this.invitesNoteShown.set(false);
        this.storageService.invitesNoteHidden = true;
    }

    onScroll() {
        this.currentPage++;
        this.loadInvites();
    }

    markAsViewed(invite: ConnectionInvite, index: number) {
        this.trackingService.trackUserProfileClicked(invite.contactUser, 'invites', index);

        if (this.receivedInvites && !invite.viewed) {
            this.inviteService.viewInvite(invite.id).subscribe();
        }
    }

    onUserViewClick(userId: string) {
        this.storageService.lastClickedInviteUserId = userId;
        this.navigationService.showPremium();
    }

    private loadInvites() {
        this.inviteService
            .getInvites(this.receivedInvites ? 'received' : 'sent', this.startDate, this.currentPage, this.pageSize)
            .subscribe(
                res => {
                    this.invites.update(value => [...value, ...res.data]);
                    this.loading.set(false);

                    if (this.invites().length >= 5 && this.authUser.isParent && !this.storageService.fifthInviteViewedTime) {
                        this.storageService.fifthInviteViewedTime = new Date();
                    }
                },
                _ => this.loading.set(false),
            );
    }
}
