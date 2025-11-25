import { NewFieldsPromptComponent } from 'app/components/prompt/new-fields-prompt/new-fields-prompt.component';
import { PhotoUploadPurpose } from 'app/models/api/photo';
import { takeUntil } from 'rxjs/operators';
import { ComponentHostDirective } from 'app/directives/component-host.directive';
import { NavigationEnd, Router } from '@angular/router';
import { UserUpdatesService } from 'app/services/user-updates.service';
import { inject, Component, OnInit, ViewChild, Type } from '@angular/core';
import { Prompt, PromptType } from 'app/models/api/prompt';
import { PromptResolver, DesktopPromptResolver, MobilePromptResolver } from 'app/components/prompt/prompt-resolver';
import { EventAction, EventCategory, PromptEvents } from 'app/services/tracking/types';
import { BaseComponent } from 'app/components/base.component';
import { AppEvent, AppEventService, AppEventType, RecommendationSentNotification } from 'app/services/event.service';
import { TranslateService } from '@ngx-translate/core';
import { ApiInterceptor } from 'app/services/api/api.service';
import { ReportService } from 'app/services/api/report.service';
import { RouteType } from 'routing/route-type';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseOverlayComponent } from 'app/components/common/overlay-content/base-overlay.component';
import { PhotoOverlayService } from 'app/services/overlay/photo-overlay.service';
import { AvailabilityOverlayComponent } from 'app/components/common/overlay-content/availability-overlay/availability-overlay.component';
import { ComponentType } from '@angular/cdk/portal';
import { StandardOverlayComponent } from 'app/components/common/overlay-content/standard-overlay/standard-overlay.component';
import { BaseOverlayContentData } from 'app/components/common/overlay-content/types';
import { ShareMethod } from 'app/models/api/country-settings-interface';
import { UcFirst } from 'modules/shared/pipes/ucfirst.pipe';
import { ReviewService } from 'app/services/review.service';
import { TooltipService } from 'app/services/tooltip/tooltip.service';

@Component({
    selector: 'prompt-host',
    templateUrl: './prompt-host.component.html',
    styleUrls: ['./prompt-host.component.less'],
    standalone: true,
    imports: [ComponentHostDirective],
})
export class PromptHostComponent extends BaseComponent implements OnInit {
    readonly router = inject(Router);
    readonly userUpdatesService = inject(UserUpdatesService);
    readonly reportService = inject(ReportService);
    readonly eventsService = inject(AppEventService);
    readonly translateService = inject(TranslateService);
    readonly photoOverlayService = inject(PhotoOverlayService);
    readonly reviewService = inject(ReviewService);
    private readonly tooltipService = inject(TooltipService);

    @ViewChild(ComponentHostDirective, { static: true }) componentHost!: ComponentHostDirective;

    EventAction = EventAction;

    private currentPrompt?: NewFieldsPromptComponent;
    private scheduledPrompt?: unknown;
    private promptResolver: PromptResolver;
    private ucFirst = new UcFirst();

    ngOnInit() {
        this.promptResolver = this.isDesktop()
            ? new DesktopPromptResolver(this.routeService, this.environmentService)
            : new MobilePromptResolver(this.routeService, this.environmentService);

        this.router.events.pipe(takeUntil(this.destroyed$)).subscribe(event => {
            if (!this.isDesktop() && event instanceof NavigationEnd) {
                this.clearPrompt();
                this.cd.markForCheck();
            }
        });
        this.eventsService.events.pipe(takeUntil(this.destroyed$)).subscribe(event => {
            if (event.type === AppEventType.checkPrompts) {
                this.checkPrompts();
            } else {
                this.handleEvent(event);
            }
        });

        this.checkPrompts();
        this.userUpdatesService.prompts.pipe(takeUntil(this.destroyed$)).subscribe(prompt => {
            if (prompt && this.promptResolver.isSupported(prompt)) {
                this.storageService.pushPrompt(prompt);
            }
            this.checkPrompts();
        });

        ApiInterceptor.commonError.pipe(takeUntil(this.destroyed$)).subscribe((error: HttpErrorResponse) => {
            this.showCommonErrorDialog();
            this.trackingService.trackEvent(EventCategory.errorMessage, error.url ?? '-', this.routeService.routeType());
        });
    }

    viewContainerRef() {
        return this.componentHost.viewContainerRef;
    }

    checkPrompts() {
        if (this.scheduledPrompt || this.currentPrompt || this.overlayService.hasActiveOverlay || this.tooltipService.hasActiveTooltip) {
            return;
        }

        const nextPrompt = this.storageService.getFirstPrompt();
        if (nextPrompt) {
            this.schedulePrompt(nextPrompt);
        }
    }

    showNewFieldsPrompt() {
        const componentRef = this.buildPromptComponent(NewFieldsPromptComponent);
        this.currentPrompt = componentRef.instance;
        this.currentPrompt.show();

        this.currentPrompt.setOnCancel(() => {
            this.clearPrompt();
            this.checkPrompts();
        });
        this.cd.detectChanges();
    }

    showRecurringPaymentFailed() {
        this.storageService.subscription = this.authUser.subscription;
        this.storageService.restoringRecurringPayment = true;
        this.navigationService.navigate(RouteType.premiumPaymentMethods);
    }

    showMaterialAlert(data: BaseOverlayContentData, onClose?: () => void) {
        this.clearPrompt();
        this.overlayService.openOverlay(StandardOverlayComponent, data, () => {
            onClose?.();
        });
    }

    showMaterialComponentPrompt<T extends BaseOverlayComponent>(type: ComponentType<T>) {
        this.clearPrompt();
        this.overlayService.openOverlay(type);
    }

    handleEvent(event: AppEvent) {
        switch (event.type) {
            case AppEventType.recommendationMessageSent:
                this.onRecommendationSent(event.data);
                break;
            case AppEventType.reportPhoto:
                this.onReportPhotoRequested(event.data);
                break;
        }
    }

    private clearPrompt() {
        if (this.currentPrompt) {
            this.componentHost.viewContainerRef.clear();
            this.currentPrompt = undefined;
        }
    }

    private buildPromptComponent<T>(type: Type<T>) {
        this.clearPrompt();

        this.componentHost.viewContainerRef.clear();

        return this.componentHost.viewContainerRef.createComponent(type);
    }

    private showRecommendationSuccessDialog(title: string, body: string, button: string, name: string) {
        this.trackingService.trackPromptClickEvent(PromptEvents.recommendationPromptFinal);
        this.translateService.get([title, body, button], { firstName: this.ucFirst.transform(name) }).subscribe(translations => {
            this.navigationService.back(true);
            const dialogData = {
                title: translations[title],
                message: translations[body],
                primaryBtn: {
                    title: translations[button],
                    action: () => {
                        this.navigationService.navigate(RouteType.recommendations);
                        this.trackingService.trackPromptClickEvent(PromptEvents.recommendationPromptFinalAskAnotherParent);
                    },
                },
                doOnClose: () => this.trackingService.trackPromptClickEvent(PromptEvents.recommendationParentWhatsappMessengerSmsClose),
            };

            setTimeout(() => {
                this.showMaterialAlert(dialogData);
            }, 300);
        });
    }

    private onRecommendationSent(data: RecommendationSentNotification) {
        const { name, shareMethod } = data;
        if (shareMethod === ShareMethod.email) {
            this.showRecommendationSuccessDialog(
                'recommendations.sent',
                'recommendations.yourMessageWasEmailed',
                'recommendations.successDialogButton',
                name,
            );
        } else if (shareMethod === ShareMethod.copy) {
            this.showRecommendationSuccessDialog(
                'recommendations.messageCopied.title',
                'recommendations.messageCopied.message',
                'recommendations.successDialogButton',
                name,
            );
        } else {
            this.showRecommendationSuccessDialog(
                'recommendations.successDialogTitle',
                'recommendations.successDialogMessage',
                'recommendations.successDialogButton',
                name,
            );
        }
    }

    private onReportPhotoRequested(data: { userId: string }) {
        const dialogData: BaseOverlayContentData = {
            title: 'profile.reportPhotoOverlay.title',
            message: 'profile.reportPhotoOverlay.message',
            secondaryBtn: { title: 'main.cancel' },
            primaryBtn: { title: 'profile.reportPhotoOverlay.btnReport', action: () => this.reportPhoto(data.userId) },
        };

        this.showMaterialAlert(dialogData);
    }

    private reportPhoto(userId: string) {
        this.clearPrompt();
        this.reportService.reportUserPhoto(userId).subscribe(_ => this.showReportPhotoConfirmation());
    }

    private showReportPhotoConfirmation() {
        const dialogData: BaseOverlayContentData = {
            title: 'profile.reportPhotoConfirmation.title',
            message: 'profile.reportPhotoConfirmation.message',
            secondaryBtn: { title: 'main.close' },
        };

        this.showMaterialAlert(dialogData);
    }

    private showRecommendationPromptOverlay() {
        this.showMaterialAlert({
            title: 'recommendationPromptOverlay.title',
            primaryBtn: { title: 'recommendationPromptOverlay.cta.positive', action: () => this.showAskForRecommendationLinkOverlay() },
            secondaryBtn: { title: 'recommendationPromptOverlay.cta.negative' },
        });
    }

    private showAskForRecommendationLinkOverlay() {
        this.showMaterialAlert({
            title: 'askForRecommendationLinkOverlay.title',
            primaryBtn: {
                title: 'askForRecommendationLinkOverlay.cta.positive',
                action: () => {
                    this.navigationService.navigate(RouteType.recommendations);
                },
            },
            secondaryBtn: { title: 'askForRecommendationLinkOverlay.cta.negative' },
        });
    }

    private showCommonErrorDialog() {
        setTimeout(() => {
            this.showMaterialAlert({
                title: 'main.errorAlert.title',
                message: 'main.errorAlert.message',
                primaryBtn: { title: 'main.errorAlert.tryAgain' },
            });
        }, 300);
    }

    private schedulePrompt(prompt: Prompt) {
        // prompt delay is specified in seconds, multiply it by 1000 to get prompt timeout
        const timeout = prompt.delay ? prompt.delay : 0;
        this.scheduledPrompt = setTimeout(
            () => {
                this.handlePrompt(prompt);
                this.scheduledPrompt = null;
            },
            timeout * 1000 + 1000,
        );
    }

    private handlePrompt(prompt: Prompt) {
        if (!this.promptResolver.isAppropriate(prompt) || this.overlayService.hasActiveOverlay) {
            return;
        }

        this.storageService.removePromptsByType(prompt.type);
        this.clearPrompt();

        switch (prompt.type) {
            case PromptType.fillNewProperties:
                this.showNewFieldsPrompt();
                break;
            case PromptType.recurringPaymentFailed:
                this.showRecurringPaymentFailed();
                break;
            case PromptType.firstRecommendation:
                this.showRecommendationPromptOverlay();
                break;
            case PromptType.noAvailabilityReminder:
            case PromptType.availabilityReminder:
                this.showMaterialComponentPrompt(AvailabilityOverlayComponent);
                break;
            case PromptType.avatarReminder:
                this.showAvatarOverlay();
                break;
            case PromptType.negativeReview:
            case PromptType.positiveReview:
            case PromptType.positiveReviewEkomi:
            case PromptType.positiveReviewTrustpilot:
            case PromptType.positiveReviewGoogle:
                this.reviewService.showReviewPromptOverlay(prompt.type);
                break;
            case PromptType.avatarOverlay:
                this.photoOverlayService.showPhotoFeedbackOverlay(PhotoUploadPurpose.avatar, undefined, undefined);
                break;
            default:
                break;
        }
        this.cd.markForCheck();
    }

    private showAvatarOverlay() {
        this.showMaterialAlert({
            title: 'avatarOverlay.title',
            message: 'avatarOverlay.message.sitter',
            primaryBtn: {
                title: 'avatarOverlay.cta.upload',
                action: () => this.photoOverlayService.showPhotoSourceOverlay(PhotoUploadPurpose.photo, true),
            },
            img: { name: 'illustrations/sitter-photo-update', type: 'svg' },
        });
    }
}
