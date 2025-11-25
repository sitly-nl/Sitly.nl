import { BaseComponent } from 'app/components/base.component';
import { inject, Component, ChangeDetectionStrategy, OnInit, OnDestroy, ViewChild, ElementRef, signal, HostListener } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FavoriteService } from 'app/services/api/favorite.service';
import { User } from 'app/models/api/user';
import { debounceTime, finalize, takeUntil } from 'rxjs/operators';
import { AppEventService } from 'app/services/event.service';
import { EventAction, GA4EventAction, PromptEvents } from 'app/services/tracking/types';
import { HttpErrorResponse } from '@angular/common/http';
import { UtilService } from 'app/services/util.service';
import { ProfileShareComponent } from 'app/components/user/profile/common/profile-share/profile-share.component';
import { ProfileShareType } from 'app/components/user/profile/profile-share-type';
import { Subscription, fromEvent } from 'rxjs';
import { ProfileActionType, ProfileActionsComponent } from 'app/components/user/profile/common/profile-actions/profile-actions.component';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { MessageService } from 'app/services/api/message.service';
import { ReportOverlayComponent } from 'app/components/common/report-overlay/report-overlay.component';
import { StandardOverlayComponent } from 'app/components/common/overlay-content/standard-overlay/standard-overlay.component';
import { ConnectionInviteApiService } from 'app/services/api/connection-invite.api.service';
import { Error } from 'app/services/api/api.service';
import { SimilarUsersComponent } from 'app/components/user/profile/common/similar-users/similar-users.component';
import { ProfileMapComponent } from 'app/components/user/profile/common/profile-map/profile-map.component';
import { ProfileActivityComponent } from 'app/components/user/profile/common/profile-activity/profile-activity.component';
import { ProfileSkillsComponent } from 'app/components/user/profile/foster/profile-skills/profile-skills.component';
import { FosterServicesComponent } from 'app/components/user/profile/foster/foster-services/foster-services.component';
import { ProfileExperienceComponent } from 'app/components/user/profile/foster/profile-experience/profile-experience.component';
import { FosterRecommendationsComponent } from 'app/components/user/profile/foster/foster-recommendations/foster-recommendations.component';
import { FosterTraitsComponent } from 'app/components/user/profile/foster/foster-traits/foster-traits.component';
import { ProfileJobDescriptionComponent } from 'app/components/user/profile/parent/profile-job-description/profile-job-description.component';
import { ProfileAvailabilityComponent } from 'app/components/user/profile/common/profile-availability/profile-availability.component';
import { ProfileAboutComponent } from 'app/components/user/profile/common/profile-about/profile-about.component';
import { ProfileChildrenComponent } from 'app/components/user/profile/parent/profile-children/profile-children.component';
import { ProfileNonResponderComponent } from 'app/components/user/profile/common/profile-non-responder/profile-non-responder.component';
import { ProfileNameComponent } from 'app/components/user/profile/common/profile-name/profile-name.component';
import { ProfileAvatarComponent } from 'app/components/user/profile/common/profile-avatar/profile-avatar.component';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { SharedModule } from 'modules/shared/shared.module';
import { CommonOverlayService } from 'app/services/overlay/common-overlay.service';
import { environment } from 'environments/environment';
import { FeatureService } from 'app/services/feature.service';
import { PromptType } from 'app/models/api/prompt';

@Component({
    selector: 'user-details',
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        SharedModule,
        MatMenuTrigger,
        MatMenu,
        MatMenuItem,
        ProfileAvatarComponent,
        ProfileNameComponent,
        ProfileNonResponderComponent,
        ProfileChildrenComponent,
        ProfileAboutComponent,
        ProfileAvailabilityComponent,
        ProfileJobDescriptionComponent,
        FosterTraitsComponent,
        FosterRecommendationsComponent,
        ProfileExperienceComponent,
        FosterServicesComponent,
        ProfileSkillsComponent,
        ProfileActivityComponent,
        ProfileMapComponent,
        SimilarUsersComponent,
        ProfileActionsComponent,
        TranslateModule,
    ],
})
export class ProfileComponent extends BaseComponent implements OnInit, OnDestroy {
    readonly route = inject(ActivatedRoute);
    readonly favoriteService = inject(FavoriteService);
    readonly eventService = inject(AppEventService);
    readonly translateService = inject(TranslateService);
    readonly messageService = inject(MessageService);
    readonly inviteService = inject(ConnectionInviteApiService);
    readonly commonOverlayService = inject(CommonOverlayService);
    readonly featureService = inject(FeatureService);

    EventAction = EventAction;

    user: User;
    ownProfile = false;
    isFavorite: boolean;
    showLinkCopiedMessage = false;
    notFound = false;
    showDesktopTopBarActions = false;
    showScrollToTop: boolean;
    invitedToApply = false;

    readonly inviteLoading = signal(false);

    @HostListener('window:keydown', ['$event'])
    onKeydown(event: Event) {
        if (environment.name === 'production') {
            return;
        }

        const keyEvent = event as KeyboardEvent;
        if (keyEvent.key === 'A' && keyEvent.shiftKey) {
            // add delay to avatar reminder to be able to handle it in prompt-host after invite is sent
            this.commonOverlayService.postPrompt(PromptType.avatarReminder, 10);
        } else if (keyEvent.key === 'I' && keyEvent.shiftKey && !this.authUser.isParent && this.featureService.invitesEnabled) {
            this.onInterestedClick();
        }
    }

    get recommendationsNumber() {
        return this.user?.recommendations ? this.user.recommendations.length : 0;
    }
    get showBackButton() {
        return true;
    }
    get showCloseButton() {
        return this.navigationService.getSimilarUrlCount() > 1;
    }

    get backToSearchButtonTitle() {
        if (!this.user) {
            return 'main.back';
        }
        if (this.user.isParent) {
            return this.authUser.isBabysitter ? 'profile.babysittingJobs' : 'profile.childmindingJobs';
        }
        if (this.user.isBabysitter) {
            return 'main.babysitters';
        }
        if (this.user.isChildminder) {
            return 'main.childminders';
        }
        return '';
    }
    get backButtonTitle() {
        if (!this.referrerUrl || this.showCloseButton) {
            return 'main.back';
        }

        if (this.referrerUrl.includes('/search')) {
            return this.backToSearchButtonTitle;
        }

        if (this.referrerUrl.includes('/settings')) {
            return 'main.editProfile';
        }

        if (this.referrerUrl.includes('/account')) {
            return 'settings.accountSettings';
        }

        return 'main.back';
    }
    get showMap() {
        return this.countrySettings.showMapBackend;
    }
    get showNonResponderWarning() {
        return this.authUser.isPremium && this.user?.isPotentialNonResponder;
    }
    get hasRecommendations() {
        return this.user?.recommendations?.length > 0;
    }

    @ViewChild('userDetails') private userDetailsContainer: ElementRef<HTMLDivElement>;
    private referrerUrl?: string;
    private scrollSubscription: Subscription;

    ngOnInit() {
        this.route.paramMap.pipe(takeUntil(this.destroyed$)).subscribe(params => {
            const userId = params.get('userId');
            if (userId) {
                setTimeout(() => (this.referrerUrl = this.navigationService.getPreviousUrl()), 0);
                this.loadUser(userId);
            }
        });

        this.trackCtaEvent('profilepage', EventAction.click);
    }

    ngAfterViewChecked() {
        // add on scroll listener only after user is loaded, until that user details container is not added to page layout
        if (!this.isDesktop() && this.userDetailsContainer && !this.scrollSubscription) {
            this.scrollSubscription = fromEvent(this.userDetailsContainer.nativeElement, 'scroll')
                .pipe(takeUntil(this.destroyed$), debounceTime(200))
                .subscribe(event => {
                    this.showScrollToTop = (event.target as Element).scrollTop > 1.2 * screen.height;
                    this.cd.markForCheck();
                });
        }
    }

    onScrollDesktop(event: Event) {
        const scrollTop = (event.target as Element).scrollTop;
        this.showDesktopTopBarActions = scrollTop > 200;
    }

    scrollToTop(container: HTMLElement) {
        container.scrollTo({
            top: 0,
            behavior: 'auto',
        });
    }

    smoothScrollToTop() {
        this.userDetailsContainer.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
    }

    scrollToMap() {
        const mapHeader = document.querySelector('.map-container');
        mapHeader?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    scrollTo(elementId: string) {
        const element = document.getElementById(elementId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    toggleFavorite(event?: Event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }

        this.trackingService.trackUserFavorite(this.user, this.isFavorite);

        if (!this.isFavorite) {
            this.isFavorite = true;
            this.favoriteService.addFavorite(this.user.id).subscribe(
                _ => {
                    this.isFavorite = true;
                    this.cd.markForCheck();
                },
                _ => {
                    this.isFavorite = false;
                    this.cd.markForCheck();
                },
            );
            this.trackCtaEvent('profile-page-add_favorite', EventAction.addToFavorite);
        } else {
            setTimeout(() => {
                this.isFavorite = false;
            }, 20);

            const timeout = 0;
            setTimeout(() => {
                this.favoriteService.deleteFavorite(this.user.id).subscribe(
                    (_: unknown) => {
                        this.isFavorite = false;
                        this.cd.markForCheck();
                    },
                    (_: unknown) => {
                        this.isFavorite = true;
                        this.cd.markForCheck();
                    },
                );
            }, timeout);
            this.trackCtaEvent('profile-page-remove_favorite', EventAction.addToFavorite);
        }

        if (this.isDesktop()) {
            this.isFavorite = !this.isFavorite;
        }
    }

    showRatingBar() {
        return this.user && !this.user.isParent && (this.ownProfile || this.user.averageRecommendationScore > 0);
    }

    close() {
        this.back(true);
    }

    showUserNotFoundDialog() {
        this.overlayService.openOverlay(
            StandardOverlayComponent,
            {
                title: 'profile.notFound.title',
                message: 'profile.notFound.description',
                secondaryBtn: { title: 'main.close' },
            },
            () => {
                this.navigationService.back();
            },
        );
    }

    showProfileLinkCopied() {
        setTimeout(() => {
            this.showLinkCopiedMessage = true;
            this.cd.markForCheck();
            setTimeout(() => {
                this.showLinkCopiedMessage = false;
                this.cd.markForCheck();
            }, 2500);
        }, 500);
    }

    showReportOverlay() {
        const reportComponent = this.overlayService.openOverlay(ReportOverlayComponent);
        reportComponent.user = this.user;
        this.trackingService.trackUserProfileReportClick(this.user);
    }

    onReportPhoto() {
        this.eventService.notifyReportPhoto(this.user.id);
    }

    onMessageClick() {
        this.trackingService.trackUserProfileMessageClick(this.user);
        const shouldOpenChat = (this.authUser?.isPremium || this.user.hasConversation) ?? false;
        this.navigationService.openChat(shouldOpenChat, this.user.id);
        this.trackCtaEvent('profilepage-click_message', EventAction.click);
        if (!shouldOpenChat) {
            this.trackingService.trackClickEvent({ category: 'premium', type: 'cta', description: 'as-chat-button' });
        }
    }

    onInterestedClick() {
        this.inviteLoading.set(true);
        this.inviteService
            .sendInvite(this.user.id)
            .pipe(finalize(() => this.inviteLoading.set(false)))
            .subscribe(
                _ => {
                    this.user.meta.hasReceivedConnectionInviteFromMe = true;

                    // calculate storage service fields needed for invites survey
                    if (!this.storageService.fifthInviteSentTime) {
                        this.storageService.sentInvitesAmount = 1 + (this.storageService.sentInvitesAmount ?? 0);

                        if (this.storageService.sentInvitesAmount === 5) {
                            this.storageService.fifthInviteSentTime = new Date();
                            this.storageService.sentInvitesAmount = undefined;
                        }
                    }

                    if (!this.storageService.invitesStepsShown) {
                        this.storageService.invitesStepsShown = true;
                        this.commonOverlayService.showInvitesNextStepsOverlay();
                    }

                    this.trackingService.trackInviteSent(this.user.id, this.authUser.role, GA4EventAction.inviteSuccess);
                },
                (error: Error<{ title: string }>) => {
                    if (error.status === 429) {
                        this.showInviteLimitOverlay();
                    }
                    this.trackingService.trackInviteSent(this.user.id, this.authUser.role, GA4EventAction.inviteFail);
                },
            );
    }

    showShareProfileOverlay() {
        this.trackCtaEvent('profile-page-select_share_profile', EventAction.shareProfile);
        const shareComponent = this.overlayService.openOverlay(ProfileShareComponent);
        shareComponent.user = this.user;
        shareComponent.cancel.subscribe(_ => {
            this.overlayService.closeAll();
            this.trackCtaEvent('profile-page-select_share_profile-cancel', EventAction.shareProfile);
        });
        shareComponent.share.subscribe(type => {
            if (type === ProfileShareType.copy) {
                this.showProfileLinkCopied();
            }
            this.overlayService.closeAll();
        });
    }

    userLoaded() {
        this.trackingService.trackUserProfileVisit(this.user);
        if (this.route.snapshot.queryParams.reportQR !== undefined) {
            this.showReportOverlay();
            this.navigationService.removeQueryParam('reportQR');
        }
    }

    toAskForRecommendation() {
        this.navigationService.navigate(this.RouteType.recommendations);
        this.trackingService.trackPromptClickEvent(PromptEvents.recommendationMyProfile);
    }

    showInviteToApplyOverlay() {
        this.translateService
            .get(['profile.confirmInvitation', 'chat.parentIntroductionMessage', 'profile.inviteUserToApplyTitle'], {
                sitterName: this.user.firstName,
                user: this.user.firstName,
                parentName: this.authUser.firstName,
            })
            .subscribe(translations => {
                this.overlayService.openOverlay(StandardOverlayComponent, {
                    title: 'profile.invite',
                    htmlMessage: `<h3>${translations['profile.confirmInvitation']}</h3><p>${translations['chat.parentIntroductionMessage']}</p>`,
                    primaryBtn: {
                        title: translations['profile.inviteUserToApplyTitle'],
                        action: () => this.inviteToApply(translations['chat.parentIntroductionMessage']),
                    },
                    secondaryBtn: { title: 'main.cancel' },
                });
            });
    }

    onProfileAction(actionType: ProfileActionType) {
        switch (actionType) {
            case ProfileActionType.save:
                this.toggleFavorite();
                break;
            case ProfileActionType.share:
                this.showShareProfileOverlay();
                break;
            case ProfileActionType.map:
                this.scrollToMap();
                break;
            case ProfileActionType.report:
                this.showReportOverlay();
                break;
            case ProfileActionType.message:
                this.onMessageClick();
                break;
            case ProfileActionType.interested:
                this.onInterestedClick();
                break;
        }
    }

    private showInviteLimitOverlay() {
        if (this.authUser.isPremium) {
            this.commonOverlayService.showInvitesFairUsePolicyOverlay();
        } else {
            this.commonOverlayService.showInvitesLimitOverlay(this.countrySettings.invitesDailyLimit);
        }
    }

    private delayedSmoothScroll() {
        UtilService.tryUntil(
            () => {
                if (this.userDetailsContainer) {
                    this.smoothScrollToTop();
                }
                return !!this.userDetailsContainer;
            },
            100,
            5,
        );
    }

    private loadUser(userId: string) {
        this.ownProfile = userId === this.authUser.id || userId === 'me';
        const newUser = this.ownProfile ? this.userService.authUser : this.getFromCache(userId);
        if (newUser) {
            this.user = newUser;
            this.cd.markForCheck();
            this.delayedSmoothScroll();
            this.userLoaded();
        }

        this.userService.getUser(userId).subscribe(
            response => {
                const user = response.data;
                if (user) {
                    this.user = user;
                    this.isFavorite = this.user.meta.isFavorite;

                    this.cd.markForCheck();
                    this.delayedSmoothScroll();
                    if (!newUser) {
                        this.userLoaded();
                    }
                }
            },
            (err: HttpErrorResponse) => {
                if (err.status === 404) {
                    this.showUserNotFoundDialog();
                    this.cd.markForCheck();
                }
            },
        );
    }

    private inviteToApply(content: string) {
        this.messageService
            .send(this.user.id, content)
            .pipe(finalize(() => this.cd.markForCheck()))
            .subscribe(_ => {
                this.invitedToApply = true;
                this.commonOverlayService.showInviteToApplySentOverlay();
            });
    }

    private getFromCache(userId: string) {
        return this.storageService.cachedUsers.find(user => user.id === userId);
    }
}
