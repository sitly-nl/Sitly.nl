import { Injectable, inject } from '@angular/core';
import { UserRole } from 'app/models/api/user';
import { OverlayService } from 'app/services/overlay/overlay.service';
import { UserService } from 'app/services/user.service';
import { AppEventService } from 'app/services/event.service';
import { StandardOverlayComponent } from 'app/components/common/overlay-content/standard-overlay/standard-overlay.component';
import { EditReferenceComponent } from 'app/components/settings/foster/edit-reference/edit-reference.component';
import { Reference } from 'app/models/api/reference';
import { StorageService } from 'app/services/storage.service';
import { TrackingService } from 'app/services/tracking/tracking.service';
import { InvitesNextStepsComponent } from 'app/components/invites/invites-next-steps/invites-next-steps.component';
import { UserUpdatesService } from 'app/services/user-updates.service';
import { Prompt, PromptType } from 'app/models/api/prompt';
import { NavigationService } from 'app/services/navigation.service';
import { NonResponseOverlayComponent } from 'app/components/conversations/messages/non-response-overlay/non-response-overlay.component';
import { LocaleService } from 'app/services/locale.service';

@Injectable({
    providedIn: 'root',
})
export class CommonOverlayService {
    private readonly overlayService = inject(OverlayService);
    private readonly userService = inject(UserService);
    private readonly eventsService = inject(AppEventService);
    private readonly localeService = inject(LocaleService);
    private readonly storageService = inject(StorageService);
    private readonly trackingService = inject(TrackingService);
    private readonly userUpdatesService = inject(UserUpdatesService);
    private readonly navigationService = inject(NavigationService);

    openWelcomeOverlay() {
        this.overlayService.openOverlay(
            StandardOverlayComponent,
            {
                title: 'overlay.welcome.title',
                message:
                    this.userService.authUser?.role === UserRole.parent
                        ? 'overlay.welcome.description.parent'
                        : 'overlay.welcome.description.foster',
                primaryBtn: { title: 'overlay.welcome.cta' },
                img: { name: 'confetti', type: 'svg' },
            },
            () => this.eventsService.notifyInitialOverlayClosed(),
        );
    }

    showEditReferenceOverlay() {
        const overlay = this.overlayService.openOverlay(EditReferenceComponent);

        const reference = new Reference();
        reference.familyName = 'Villa Ripol';
        reference.description =
            'Sira has been an incredible addition to our family, providing exceptional care to our children.' +
            'We are grateful to have had Sira as our babysitter. She has become an invaluable part of our family,' +
            'and it is with great pleasure that we recommend Sira for any childcare opportunity';
        overlay.reference = reference;
    }

    showTermsOverlay() {
        const lang = this.localeService.getLocaleCode();
        const url = `https://www.sitly.com/${lang}/terms`;

        this.showHtmlOverlay(url);
    }

    showPrivacyOverlay() {
        const lang = this.localeService.getLocaleCode();
        const url = `https://www.sitly.com/${lang}/privacy`;

        this.showHtmlOverlay(url);
    }

    showPremiumSuccessOverlay() {
        this.overlayService.openOverlay(
            StandardOverlayComponent,
            {
                title: 'premium.paymentComplete',
                message: 'premium.youNowHaveAccess',
                primaryBtn: { title: 'premium.letsGo' },
                img: { name: 'confetti', type: 'svg' },
            },
            () => {
                this.trackingService.trackClickEvent({
                    category: 'premium',
                    type: 'button',
                    description: 'payment-paid-confirm',
                });
            },
        );
    }

    showVisibleAgainOverlay() {
        this.overlayService.openOverlay(StandardOverlayComponent, {
            title: 'prompts.visibleAgainTitle',
            message: 'prompts.visibleAgainText',
            primaryBtn: { title: 'prompts.visibleAgainBtnOk' },
        });
    }

    showInvitesFairUsePolicyOverlay() {
        this.overlayService.openOverlay(
            StandardOverlayComponent,
            {
                title: 'inviteFairUsePolicyOverlay.title',
                message: 'inviteFairUsePolicyOverlay.message',
                secondaryBtn: { title: 'main.gotIt' },
            },
            undefined,
            true,
        );
    }

    showInvitesLimitOverlay(dailyLimit = 0) {
        this.overlayService.openOverlay(
            StandardOverlayComponent,
            {
                title: 'inviteDailyLimitOverlay.title',
                message: 'inviteDailyLimitOverlay.message',
                trackCategory: 'premium',
                trackName: 'daily-limit-reached',
                messageArgs: { amount: `${dailyLimit}` },
                primaryBtn: { title: 'inviteDailyLimitOverlay.cta.getPremium', action: () => this.navigationService.showPremium() },
                secondaryBtn: { title: 'inviteDailyLimitOverlay.cta.tryAgainTomorrow' },
            },
            undefined,
            true,
        );
    }

    showInvitesNextStepsOverlay() {
        this.overlayService.openOverlay(InvitesNextStepsComponent, undefined, undefined, true);
    }

    showInviteToApplySentOverlay() {
        this.overlayService.openOverlay(StandardOverlayComponent, {
            title: 'profile.invitationSent',
            message: 'profile.invitationSentContent',
            primaryBtn: { title: 'main.close' },
        });
    }

    showNonResponseVictimOverlay() {
        this.overlayService.openOverlay(NonResponseOverlayComponent);
    }

    postPrompt(promptType: PromptType, delay = 0) {
        this.storageService.clearPrompts();
        this.userUpdatesService.prompts.next(Prompt.promptWithType(promptType, delay));
    }

    private showHtmlOverlay(url: string) {
        fetch(url)
            .then(res => res.text())
            .then(text => {
                text = text.substring(text.indexOf('<body>') + 6, text.indexOf('</body>'));
                this.overlayService.openOverlay(StandardOverlayComponent, {
                    htmlMessage: text,
                    textAlignLeft: true,
                    primaryBtn: { title: 'main.close' },
                });
            });
    }
}
