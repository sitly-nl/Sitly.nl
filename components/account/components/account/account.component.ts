import { ToolbarActionType, ToolbarBorderStyle } from 'modules/shared/components/toolbar-old/toolbar.component';
import { RouteType } from 'routing/route-type';
import { BaseComponent } from 'app/components/base.component';
import { HiddenUserService } from 'app/services/hidden-user.service';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { SubscriptionService, WinbackReason } from 'app/services/api/subscription.service';
import { User } from 'app/models/api/user';
import { SessionService } from 'app/services/session.service';
import { takeUntil } from 'rxjs/operators';
import { AppEventService, AppEventType } from 'app/services/event.service';
import { isBefore, isToday } from 'date-fns';
import { EventAction, PromptEvents } from 'app/services/tracking/types';
import { LocaleInterface } from 'app/models/api/country-settings-interface';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SettingsOverlayService } from 'app/services/overlay/settings-overlay.service';
import { PhotoUploadPurpose } from 'app/models/api/photo';
import { PhotoOverlayService } from 'app/services/overlay/photo-overlay.service';
import { TranslateModule } from '@ngx-translate/core';
import { FormCheckboxComponent } from 'app/components/common/form/checkbox.component';
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'modules/shared/shared.module';
import { ManagePremiumComponent } from 'app/components/premium/manage-premium/manage-premium.component';
import { NotificationPreferencesApiService } from 'app/services/api/notification-preferences.api.service';
import { EmailFrequency, NotificationPreferences } from 'app/models/api/notification-preferences';
import { FeatureService } from 'app/services/feature.service';

enum AccountScreen {
    managePremium = 'managePremium',
}

@Component({
    selector: 'account',
    templateUrl: 'account.component.html',
    styleUrls: ['./account.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [SharedModule, FormsModule, FormCheckboxComponent, ManagePremiumComponent, RouterLink, TranslateModule],
})
export class AccountComponent extends BaseComponent implements OnInit {
    readonly sessionService = inject(SessionService);
    readonly subscriptionService = inject(SubscriptionService);
    readonly hiddenUserService = inject(HiddenUserService);
    readonly eventService = inject(AppEventService);
    readonly route = inject(ActivatedRoute);
    readonly settingsOverlayService = inject(SettingsOverlayService);
    readonly photoOverlayService = inject(PhotoOverlayService);
    readonly notificationPreferencesService = inject(NotificationPreferencesApiService);
    readonly featureService = inject(FeatureService);

    EventAction = EventAction;
    ToolbarBorderStyle = ToolbarBorderStyle;
    ToolbarActionType = ToolbarActionType;

    get showDiscountOffer() {
        return (
            !this.environmentService.isAndroidApp &&
            (((this.authUser.canCancelPremium || !this.authUser.isPremium) &&
                this.authUser.discountPercentage === 0 &&
                (!this.authUser.discountOfferedDate || isToday(new Date(this.authUser.discountOfferedDate)))) ||
                (!this.authUser.isPremium && this.authUser.discountPercentage > 0 && isToday(new Date(this.authUser.discountOfferedDate))))
        );
    }
    get userLocaleCode() {
        return this.localeService.getLocaleCode();
    }
    get showMatchMailRoles() {
        return this.authUser?.isParent && this.countrySettings.showChildminders;
    }
    get isLookingForBabysitters() {
        return this.authUser?.isParent && this.authUser?.searchPreferences?.babysitters;
    }
    get isLookingForChildminders() {
        return this.authUser?.isParent && this.authUser?.searchPreferences?.childminders;
    }
    get discount() {
        return this.countrySettings.winbackDiscountPercentage;
    }
    get showFreePremiumSection() {
        return this.countrySettings.countryCode === 'de' && isBefore(new Date(), new Date('2022-03-02'));
    }
    get showEmailBouncedMessage() {
        return !!this.authUser?.emailBounced;
    }

    languages: LocaleInterface[];
    saved = false;
    changingPassword = false;
    showLanguageSelector = false;
    winbackTrigger: WinbackReason;
    premiumWinbackTriggered = false;

    readonly notificationPreferences = signal<NotificationPreferences | undefined>(this.storageService.notificationPreferences);
    readonly showNotificationPreferences = computed(
        () => this.featureService.invitesEnabled && this.authUser.isParent && this.notificationPreferences(),
    );

    private oldUser: User;

    ngOnInit() {
        this.refresh();
        this.userService.refreshAuthUser().subscribe(() => {
            this.refresh();
        });

        this.notificationPreferencesService.getPreferences().subscribe(res => this.onNotificationPreferencesUpdate(res.data));

        this.languages = this.countrySettings.locales;
        this.showLanguageSelector = Object.keys(this.languages).length > 1;

        this.userService.changed.pipe(takeUntil(this.destroyed$)).subscribe(_ => this.refresh());

        this.eventService.events.pipe(takeUntil(this.destroyed$)).subscribe(event => {
            if (event.type === AppEventType.paymentComplete) {
                this.cd.markForCheck();
                setTimeout(() => {
                    if (this.authUser.isPremium && this.authUser.discountPercentage > 0) {
                        this.showAcceptedPremiumDiscountDialog();
                    }
                });
            }
        });

        this.route.queryParamMap.pipe(takeUntil(this.destroyed$)).subscribe(params => {
            if (params.get('showScreen') === AccountScreen.managePremium) {
                if (this.authUser.canCancelPremium) {
                    setTimeout(() => {
                        // wait till dialog loaded
                        this.showManagePremium();
                    }, 0);
                }
                this.navigationService.removeQueryParam('showScreen');
            }
        });
    }

    save(event: Event) {
        const el = event.target as HTMLInputElement;
        const field = el.name;
        let value: unknown;
        if (el.type === 'checkbox') {
            if (el.name === 'shareProfileWithPartners' || el.name === 'hasPublicProfile') {
                value = el.checked ? 0 : 1;
            } else {
                value = el.checked ? 1 : 0;
            }
        } else {
            value = el.value;
        }

        if (this.oldUser[field as keyof User] !== value) {
            this.updateUser({ [field]: value });
        }
    }

    onInvitesEmailPreferencesChange(event: Event) {
        const value = (event.target as HTMLSelectElement).value as EmailFrequency;
        this.notificationPreferencesService
            .updateConnectionInvitesPreferences(value)
            .subscribe(res => this.onNotificationPreferencesUpdate(res.data));
    }

    onActionButtonClick(action: ToolbarActionType) {
        if (action === ToolbarActionType.logout) {
            this.sessionService.signOut();
        }
    }

    logout(event: Event) {
        event.preventDefault();
        this.sessionService.signOut();
    }

    changePassword(password: string) {
        setTimeout(() => {
            this.changingPassword = false;
        }, 500);

        this.updateUser({ password });
    }

    changeEmail(email: string) {
        if (this.authUser.email !== email) {
            this.updateUser({ email });
        }
    }

    changeLanguage(event: Event) {
        const element = event.target as HTMLInputElement;
        const localeCode = element.value;
        this.userService.saveUser({ localeCode }).subscribe(_ => this.sessionService.changeLanguage(localeCode));
    }

    toAskForRecommendations() {
        this.navigationService.navigate(RouteType.recommendations);
        this.trackingService.trackPromptClickEvent(PromptEvents.recommendationAccount);
    }

    toRecommendationsInfo(event: Event) {
        event.stopPropagation();
        this.navigationService.navigate(RouteType.recommendations, { screen: 'info' });
    }

    openHiddenProfiles() {
        this.navigationService.navigate(RouteType.hidden);
    }

    showStoppingPremium() {
        if (this.showDiscountOffer) {
            this.winbackTrigger = 'cancelPremium';
            this.showDiscountPremiumWinback();
            this.trackCtaEvent('stop-premium-win-back-prompt', EventAction.open, false);
        } else {
            this.showManagePremium();
        }
    }

    showManagePremium() {
        if (this.isDesktop()) {
            this.settingsOverlayService.showPremiumMembershipOverlay(this.authUser, () => this.showStoppingPremiumDialog());
        } else {
            this.showStoppingPremiumDialog();
            this.trackCtaEvent('stop-premium-confirmation-prompt', EventAction.open, false);
        }
    }

    onPhotoRequested() {
        this.trackingService.trackPhotoUploadEvent('photo-select');
        this.photoOverlayService.showPhotoSourceOverlay(PhotoUploadPurpose.avatar);
    }

    showPremium() {
        this.navigationService.showPremium();
    }

    onDeleteAccountClick() {
        this.trackCtaEvent('stop-premium-win-back_select_stop_premium', EventAction.click, false);
        if (this.showDiscountOffer) {
            this.winbackTrigger = 'deleteAccount';
            this.showDiscountPremiumWinback();
            this.trackCtaEvent('delete-account_win-back-prompt', EventAction.open, false);
        } else {
            this.showDeleteWinbackOverlay();
        }
    }

    showDisableAccountDialog() {
        this.settingsOverlayService.showDisableAccountOverlay(() => this.sessionService.disableAccount());
    }

    showReactivatePremiumConfirmationDialog() {
        this.settingsOverlayService.showReactivatePremiumConfirmationOverlay(this.authUser);
    }

    showResumePremiumConfirmationDialog() {
        this.settingsOverlayService.showResumePremiumConfirmationOverlay();
    }

    showInvoicesOverlay() {
        this.settingsOverlayService.showInvoicesOverlay();
    }

    // ---- Internal ---- //
    private stopPremium(eventName: string) {
        this.trackCtaEvent(eventName, EventAction.click, false);

        const pageName = '/cancel-premium';
        this.trackingService.trackCustomPageView(pageName);
        this.subscriptionService.stopPremium().subscribe(response => {
            if (response?.data) {
                this.userService.authUser = response.data;
                this.settingsOverlayService.showStoppedPremiumOverlay(this.authUser);
                this.cd.markForCheck();
            }
        });
    }

    private enableDiscount() {
        this.trackCtaEvent('stop-premium-win-back_select_keep_premium', EventAction.click, false);
        this.subscriptionService.enableDiscount(this.winbackTrigger).subscribe(response => {
            if (response?.data) {
                if (this.winbackTrigger === 'cancelPremium') {
                    this.trackingService.trackCustomPageView(`enable-discount_${this.authUser.isParent ? 'parent' : 'sitter'}`);
                }
                this.userService.authUser = response.data;
                if (this.authUser.isPremium) {
                    this.showAcceptedPremiumDiscountDialog();
                } else {
                    let selectedSubscription;
                    this.countrySettings.subscriptions.forEach(subscription => {
                        if (subscription.duration === 1) {
                            selectedSubscription = subscription;
                        }
                    });
                    this.storageService.subscription = selectedSubscription;
                    this.navigationService.navigate(RouteType.premiumPaymentMethods);
                }
                this.cd.markForCheck();
            }
        });
    }

    private showAcceptedPremiumDiscountDialog() {
        this.settingsOverlayService.showAcceptedPremiumDiscountOverlay(this.authUser, this.discount);
    }

    private hideAccountClicked() {
        this.trackCtaEvent('stop-premium-win-back_select_stop_premium', EventAction.click, false);

        if (this.authUser.isPremium) {
            const pageName = '/cancel-premium';
            this.trackingService.trackCustomPageView(pageName);
            this.subscriptionService.stopPremium().subscribe(response => {
                this.sessionService.disableAccount();
                if (response?.data) {
                    this.userService.authUser = response.data;
                    this.cd.markForCheck();
                }
            });
        } else {
            this.sessionService.disableAccount();
        }
    }

    private ignorePremiumWinback() {
        this.trackCtaEvent('stop-premium-win-back_select_stop_premium', EventAction.click, false);
        if (!this.winbackTrigger || this.winbackTrigger === 'deleteAccount') {
            setTimeout(() => this.showDeleteWinbackOverlay(), 0);
            this.premiumWinbackTriggered = false;
        }
    }

    private showDeleteWinbackOverlay() {
        this.settingsOverlayService.showDeleteWinbackOverlay(this.showDiscountOffer, {
            onClose: () => this.trackCtaEvent('stop-delete-win-back_select_close', EventAction.click, false),
            onDeleteAccount: () => this.removeAccount(),
            onBackClicked: () => this.onDeleteAccountClick(),
            onHideAccount: () => this.hideAccountClicked(),
            onUseForFree: () => this.showThanksForUsingOverlay(),
        });
    }

    private showThanksForUsingOverlay() {
        this.settingsOverlayService.showThanksForUsingForFreeOverlay(() => {
            this.navigationService.navigate(RouteType.settings);
        });
        this.trackCtaEvent('stop-premium-win-back_select_stop_premium', EventAction.click, false);
    }

    private showPremiumWinbackOverlay() {
        this.premiumWinbackTriggered = true;
        this.settingsOverlayService.showPremiumWinbackOverlay(this.winbackTrigger ?? 'deleteAccount', {
            onClose: () => {
                this.trackCtaEvent('stop-premium-win-back_select_close', EventAction.click, false);
            },
            onEnableDiscount: () => {
                this.enableDiscount();
            },
            onCancelPremium: () => {
                this.stopPremium('stop-premium-win-back_select_stop_premium');
            },
            onDeleteAccount: () => this.ignorePremiumWinback(),
        });
    }

    private showStoppingPremiumDialog() {
        this.settingsOverlayService.showStoppingPremiumOverlay(this.authUser, {
            onPrimary: () => this.stopPremium('stop-premium-confirmation_select_yes-stop-premium'),
            onSecondary: () => this.showStillPremiumOverlay(),
        });
    }

    private showStillPremiumOverlay() {
        this.settingsOverlayService.showStillPremiumOverlay();
        this.trackCtaEvent('stop-premium-confirmation_select_no-keep-premium', EventAction.click, false);
    }

    private showDiscountPremiumWinback() {
        if (!this.authUser.discountOfferedDate) {
            this.updateUser({ discountOfferedDate: new Date().toISOString() });
        }
        this.showPremiumWinbackOverlay();
    }

    private removeAccount() {
        this.trackCtaEvent('delete-account_win-back_select_delete_account', EventAction.click, false);
        if (this.authUser.isPremium) {
            this.trackCtaEvent('stop-premium-win-back_select_stop_premium', EventAction.click, false);
        }

        const premiumPostfix = this.authUser.isPremium ? 'premium' : 'nonpremium';
        const pageName = '/delete-account-' + premiumPostfix;
        this.trackingService.trackCustomPageView(pageName);

        this.userService.deleteUser().subscribe(() => {
            this.sessionService.cleanData();
            this.settingsOverlayService.showAccountDeletedOverlay(() => this.sessionService.signOut());
        });
    }

    private updateUser(data: Record<string, unknown>) {
        this.userService.saveUser(data).subscribe(_ => {
            setTimeout(() => {
                this.saved = true;
                this.cd.markForCheck();
                setTimeout(() => {
                    this.saved = false;
                    this.cd.markForCheck();
                }, 2_000);
            }, 500);

            this.refresh();
        });
    }

    private onNotificationPreferencesUpdate(preferences: NotificationPreferences) {
        this.storageService.notificationPreferences = preferences;
        this.notificationPreferences.set(preferences);
    }

    private refresh() {
        this.oldUser = this.authUser.deepCopy();
        this.cd.markForCheck();
    }
}
