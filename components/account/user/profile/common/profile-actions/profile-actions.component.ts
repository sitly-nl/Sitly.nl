import { inject, Component, EventEmitter, Input, OnInit, Output, signal, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import { ProfileBlockComponent } from 'app/components/user/profile/common/profile-block/profile-block.component';
import { EventAction } from 'app/services/tracking/types';
import { FavoriteService } from 'app/services/api/favorite.service';
import { FeatureService } from 'app/services/feature.service';
import { User } from 'app/models/api/user';
import { InvitesTooltipService } from 'app/services/tooltip/invites-tooltip.service';
import { TranslateModule } from '@ngx-translate/core';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { SharedModule } from 'modules/shared/shared.module';
import { takeUntil } from 'rxjs/operators';

export enum ProfileActionType {
    share = 'share',
    report = 'report',
    save = 'save',
    message = 'message',
    map = 'map',
    interested = 'interested',
}

@Component({
    selector: 'profile-actions',
    templateUrl: './profile-actions.component.html',
    styleUrls: ['./profile-actions.component.less'],
    standalone: true,
    imports: [SharedModule, MatMenuTrigger, MatMenu, MatMenuItem, TranslateModule],
})
export class ProfileActionsComponent extends ProfileBlockComponent implements OnInit {
    readonly favoriteService = inject(FavoriteService);
    readonly featureService = inject(FeatureService);
    readonly invitesTooltipService = inject(InvitesTooltipService);

    @Input() view: 'mobile' | 'desktop' | 'desktop-simple' = 'mobile';
    @Input() inviteLoading = false;
    @Output() readonly action = new EventEmitter<ProfileActionType>();

    @ViewChild('interestedBtn', { static: false, read: ElementRef }) interestedRef?: ElementRef<HTMLElement>;
    @ViewChild('componentContainer') containerRef?: ElementRef<HTMLElement>;

    EventAction = EventAction;
    ProfileActionType = ProfileActionType;
    isFavorite = signal(false);

    get btnFavoriteIcon() {
        return this.isFavorite() ? 'assets/images/profile/profile-saved.svg' : 'assets/images/profile/profile-not-saved.svg';
    }
    get showViewMapLink() {
        return this.isDesktop() && this.countrySettingsService.countrySettings?.showMapBackend && !this.ownProfile && !this.user.isParent;
    }
    get canChat() {
        return this.authUser.isPremium || this.user.hasConversation;
    }
    get inviteSent() {
        return !!this.user.meta.hasReceivedConnectionInviteFromMe;
    }
    get showProfileSent() {
        return this.featureService.invitesEnabled && this.inviteSent;
    }
    get showMessage() {
        return (
            !this.featureService.invitesEnabled ||
            this.authUser.isParent ||
            this.authUser.isPremium ||
            this.user.hasConversation ||
            this.inviteSent
        );
    }
    get showInterested() {
        return this.featureService.invitesEnabled && !this.authUser.isParent && !this.inviteSent && !this.user.hasConversation;
    }
    get showOptionsButton() {
        return this.view !== 'mobile' && !this.ownProfile;
    }
    get showFavoriteButton() {
        return this.view !== 'mobile' && !this.ownProfile;
    }
    get showShareButton() {
        return this.view !== 'mobile' && !this.ownProfile && this.user.hasPublicProfile;
    }

    ngOnInit() {
        this.isFavorite.set(this.user.meta?.isFavorite);
        this.updateFavorites();
        this.favoriteService.changed.pipe(takeUntil(this.destroyed$)).subscribe(users => {
            const user = users.find(item => item.id === this.user.id);
            if (user) {
                this.isFavorite.set(user.meta?.isFavorite);
            } else {
                this.updateFavorites();
            }
            this.cd.markForCheck();
        });
    }

    ngOnChanges(changes: SimpleChanges) {
        const meta = (changes.user?.currentValue as User)?.meta;
        if (meta?.hasReceivedConnectionInviteFromMe === false && !this.storageService.invitesTooltipShown) {
            setTimeout(() => {
                if (this.interestedRef) {
                    this.invitesTooltipService.showSitterTooltipIfNeeded(
                        this.interestedRef,
                        this.view === 'mobile' ? this.containerRef : this.interestedRef,
                    );
                }
            }, 0);
        }
    }

    onInterestedClick() {
        this.action.emit(ProfileActionType.interested);
    }

    private updateFavorites() {
        this.favoriteService.favorites.subscribe(users => {
            const user = users.find(item => item.id === this.user.id);
            this.isFavorite.set(user?.isFavorite ?? false);
            this.cd.markForCheck();
        });
    }
}
