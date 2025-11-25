import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { User } from 'app/models/api/user';
import { formattedDate } from 'app/models/date-languages';
import { PremiumWinbackComponent } from 'app/components/account/premium-winback/premium-winback.component';
import { DeleteWinbackComponent } from 'app/components/account/delete-winback/delete-winback.component';
import { InvoicesComponent } from 'app/components/account/invoices/invoices.component';
import { addDays } from 'date-fns';
import { UserService } from 'app/services/user.service';
import { TrackingService } from 'app/services/tracking/tracking.service';
import { PaymentService } from 'app/services/api/payment.service';
import { NavigationService } from 'app/services/navigation.service';
import { SubscriptionService, WinbackReason } from 'app/services/api/subscription.service';
import { OverlayService } from 'app/services/overlay/overlay.service';
import { StandardOverlayComponent } from 'app/components/common/overlay-content/standard-overlay/standard-overlay.component';
import { LocaleService } from 'app/services/locale.service';

@Injectable({
    providedIn: 'root',
})
export class SettingsOverlayService {
    private readonly overlayService = inject(OverlayService);
    private readonly userService = inject(UserService);
    private readonly trackingService = inject(TrackingService);
    private readonly paymentService = inject(PaymentService);
    private readonly subscriptionService = inject(SubscriptionService);
    private readonly navigationService = inject(NavigationService);
    private readonly translateService = inject(TranslateService);
    private readonly localeService = inject(LocaleService);

    showAccountHiddenOverlay(onClose: () => void) {
        this.overlayService.openOverlay(
            StandardOverlayComponent,
            {
                title: 'settings.yourAccountHidden.title',
                message: 'settings.yourAccountHidden.message',
                primaryBtn: { title: 'settings.seeYouSoon' },
            },
            onClose,
        );
    }

    showAccountDeletedOverlay(onClose: () => void) {
        this.overlayService.openOverlay(
            StandardOverlayComponent,
            {
                title: 'settings.yourAccountDeleted.title',
                message: 'settings.yourAccountDeleted.message',
                primaryBtn: { title: 'settings.goodBye' },
            },
            onClose,
        );
    }

    showPremiumReactivatedOverlay(user: User) {
        this.translateService
            .get(['premium.resumed.description.format'], {
                date: formattedDate(user.premiumExpiryDate, 'd MMMM', this.localeService.getLocaleCode()),
            })
            .subscribe(translations =>
                this.overlayService.openOverlay(StandardOverlayComponent, {
                    title: 'premium.resumed.title',
                    message: translations['premium.resumed.description.format'],
                    primaryBtn: { title: 'letsGo' },
                }),
            );
    }

    showDisableAccountOverlay(onPrimary: () => void) {
        this.overlayService.openOverlay(StandardOverlayComponent, {
            title: 'account.hideAccount',
            message: 'account.hideAccount.message',
            secondaryBtn: { title: 'main.cancel' },
            primaryBtn: { title: 'account.hideAndLogout', action: onPrimary },
        });
    }

    showReactivatePremiumConfirmationOverlay(user: User) {
        this.translateService
            .get(['premium.resume.confirmation.description.format', 'premium.resume.confirmation.sitterDescription.format'], {
                date: formattedDate(user.premiumExpiryDate, 'd MMMM', this.localeService.getLocaleCode()),
            })
            .subscribe(translations =>
                this.overlayService.openOverlay(StandardOverlayComponent, {
                    title: 'premium.resume.confirmation.title',
                    message: translations[`premium.resume.confirmation.${user.isParent ? 'description' : 'sitterDescription'}.format`],
                    secondaryBtn: { title: 'main.cancel' },
                    primaryBtn: { title: 'keepSitlyPremium', action: () => this.reactivatePremium() },
                }),
            );
    }

    showResumePremiumConfirmationOverlay() {
        this.translateService
            .get(['premium.resume.confirmation.description.format'], {
                date: formattedDate(addDays(new Date(), 30), 'd MMMM', this.localeService.getLocaleCode()),
            })
            .subscribe(translations =>
                this.overlayService.openOverlay(StandardOverlayComponent, {
                    title: 'account.resumeSitlyPremium.title',
                    message: translations['premium.resume.confirmation.description.format'],
                    secondaryBtn: { title: 'main.cancel' },
                    primaryBtn: { title: 'account.resumeSitlyPremium', action: () => this.resumePremium() },
                }),
            );
    }

    showPremiumResumedOverlay(user: User) {
        this.translateService
            .get(['account.youSuccessfullyResumedPremiumSubscription'], {
                date: formattedDate(user.premiumExpiryDate, 'd MMMM', this.localeService.getLocaleCode()),
            })
            .subscribe(translations => {
                this.overlayService.openOverlay(StandardOverlayComponent, {
                    title: 'account.sitlyPremiumResumed',
                    message: translations['account.youSuccessfullyResumedPremiumSubscription'],
                    primaryBtn: { title: 'letsGo' },
                });
            });
    }

    showStoppedPremiumOverlay(user: User) {
        this.translateService
            .get(['account.cancelledSubscription.description.format'], {
                date: formattedDate(user.premiumExpiryDate, 'd MMMM yyyy', this.localeService.getLocaleCode()),
            })
            .subscribe(translations =>
                this.overlayService.openOverlay(StandardOverlayComponent, {
                    title: 'account.cancelledSubscription.title',
                    message: translations['account.cancelledSubscription.description.format'],
                    primaryBtn: { title: 'main.close' },
                }),
            );
    }

    showPremiumMembershipOverlay(user: User, onPrimary: () => void) {
        this.translateService
            .get(['account.premiumMembership.description.format'], {
                date: formattedDate(user.premiumExpiryDate, 'd MMMM', this.localeService.getLocaleCode()),
            })
            .subscribe(translations =>
                this.overlayService.openOverlay(StandardOverlayComponent, {
                    title: 'account.premiumMembership.title',
                    message: translations['account.premiumMembership.description.format'],
                    secondaryBtn: { title: 'main.close' },
                    primaryBtn: { title: 'cancelSubscription', action: onPrimary },
                }),
            );
    }

    showStoppingPremiumOverlay(user: User, actions: { onPrimary: () => void; onSecondary: () => void }) {
        this.translateService
            .get(['account.cancelSubscription.description.format'], {
                date: formattedDate(user.premiumExpiryDate, 'd MMMM yyyy', this.localeService.getLocaleCode()),
            })
            .subscribe(translations =>
                this.overlayService.openOverlay(StandardOverlayComponent, {
                    title: 'account.cancelSubscription.title',
                    message: translations['account.cancelSubscription.description.format'],
                    secondaryBtn: { title: 'account.cancelSubscription.no', action: actions.onSecondary },
                    primaryBtn: { title: 'account.cancelSubscription.yes', action: actions.onPrimary },
                }),
            );
    }

    showStillPremiumOverlay() {
        this.overlayService.openOverlay(StandardOverlayComponent, {
            title: 'account.stillPremium.title',
            message: 'account.stillPremium.description',
            primaryBtn: { title: 'letsGo' },
        });
    }

    showAcceptedPremiumDiscountOverlay(user: User, discount: number) {
        const messageKey = 'premium.discount-accepted.confirmation.descriptionFormat.' + (user.isParent ? 'parents' : 'fosters');
        this.translateService
            .get([messageKey], {
                amount: discount,
            })
            .subscribe(translations =>
                this.overlayService.openOverlay(StandardOverlayComponent, {
                    title: 'premium.discount-accepted.confirmation.title',
                    message: translations[messageKey],
                    primaryBtn: { title: 'main.close' },
                }),
            );
    }

    showThanksForUsingForFreeOverlay(onPrimary: () => void) {
        this.overlayService.openOverlay(StandardOverlayComponent, {
            title: 'account.thanksForUsingFree.title',
            message: 'account.thanksForUsingFree.description',
            primaryBtn: { title: 'account.goToProfile', action: onPrimary },
        });
    }

    showPremiumWinbackOverlay(
        winbackTrigger: WinbackReason,
        actions: {
            onClose: () => void;
            onEnableDiscount: () => void;
            onCancelPremium: () => void;
            onDeleteAccount: () => void;
        },
    ) {
        const premiumWinback = this.overlayService.openOverlay(PremiumWinbackComponent, undefined, actions.onClose);
        premiumWinback.winbackTrigger = winbackTrigger;
        premiumWinback.enableDiscount.subscribe(() => actions.onEnableDiscount());
        premiumWinback.cancelPremium.subscribe(() => actions.onCancelPremium());
        premiumWinback.deleteAccount.subscribe(() => actions.onDeleteAccount());
    }

    showDeleteWinbackOverlay(
        showDiscountOffer: boolean,
        actions: {
            onClose: () => void;
            onDeleteAccount: () => void;
            onHideAccount: () => void;
            onBackClicked: () => void;
            onUseForFree: () => void;
        },
    ) {
        const deleteWinback = this.overlayService.openOverlay(DeleteWinbackComponent, undefined, actions.onClose);
        deleteWinback.showDiscountOffer = showDiscountOffer;
        deleteWinback.deleteAccount.subscribe(() => actions.onDeleteAccount());
        deleteWinback.hideAccount.subscribe(() => actions.onHideAccount());
        deleteWinback.backClicked.subscribe(() => actions.onBackClicked());
        deleteWinback.useForFree.subscribe(() => actions.onUseForFree());
    }

    showInvoicesOverlay() {
        this.overlayService.openOverlay(InvoicesComponent);
    }

    private resumePremium() {
        const pageName = '/resume-premium';
        this.trackingService.trackCustomPageView(pageName);
        this.paymentService.resumePremium().subscribe(response => {
            if (response.data.status === 'UNPAID') {
                this.navigationService.showPremium();
            } else {
                this.userService.refreshAuthUser().subscribe(response => {
                    this.showPremiumResumedOverlay(response.data);
                });
            }
        });
    }

    private reactivatePremium() {
        const pageName = '/reactivate-premium';
        this.trackingService.trackCustomPageView(pageName);
        this.subscriptionService.reactivatePremium().subscribe(response => {
            if (response?.data) {
                this.showPremiumReactivatedOverlay(response?.data);
            }
        });
    }
}
