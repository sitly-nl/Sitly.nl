import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RouteType } from 'routing/route-type';
import { BasePremiumComponent } from 'app/modules/premium/base-premium.component';
import { PremiumStartContentComponent } from 'app/modules/premium/premium-start/premium-start-content/premium-start-content.component';
import { EventAction } from 'app/services/tracking/types';
import { StandardOverlayComponent } from 'app/components/common/overlay-content/standard-overlay/standard-overlay.component';
import { SubscriptionInterface } from 'app/models/api/subscription';
import { GooglePlayService } from 'app/services/google-play.service';
import { EnvironmentUtils } from 'app/utils/device-utils';
import { FeatureService } from 'app/services/feature.service';

@Component({
    selector: 'premium-start',
    templateUrl: './premium-start.component.html',
    styleUrls: ['./premium-start.component.less'],
    standalone: true,
})
export class PremiumStartComponent extends BasePremiumComponent implements OnInit, OnDestroy {
    private readonly googlePlayService = inject(GooglePlayService);
    readonly featureService = inject(FeatureService);

    ngOnInit() {
        super.ngOnInit();

        if (this.isAndroidApp && !window.getDigitalGoodsService) {
            this.showGooglePlayConnectionError();
            return;
        }

        if (this.needTrackEvents()) {
            this.trackingService.trackCtaEvent('profilepage-click_message-premiumoverlay', EventAction.click);
        }

        const overlay = this.overlayService.openOverlay(PremiumStartContentComponent, {
            doOnClose: () => {
                this.back(true);
                this.trackingService.trackClickEvent({ category: 'premium', type: 'overlay', description: 'background' });
            },
            fullScreen: !EnvironmentUtils.isDesktop() && this.featureService.showPremiumOverlayNewDesign,
        });
        overlay.onNext.subscribe(subscription =>
            this.overlayService.closeAll(() => {
                if (this.environmentService.isAndroidApp) {
                    this.startGooglePlayPayment(subscription);
                } else {
                    this.showPaymentMethods(subscription);
                }
            }),
        );
    }

    showPaymentMethods(subscription: SubscriptionInterface) {
        this.trackPremiumCtaEvent(`select_${subscription.duration}${subscription.durationUnit}`);
        this.trackPremiumCtaEvent('select_continue');

        // save selected subscription to local storage
        this.premiumService.selectSubscription(subscription);
        const isDefaultSubscription = subscription.id === this.countrySettings.subscriptions[0]?.id;
        const productName = `${subscription.duration}M-${subscription.pricePerUnit}E`;

        this.trackingService.trackCustomPageView(
            `premium-overlay-plan-${productName}-${isDefaultSubscription ? 'default' : 'non-default'}`,
        );
        this.navigationService.navigate(RouteType.premiumPaymentMethods);
    }

    startGooglePlayPayment(subscription: SubscriptionInterface) {
        this.googlePlayService.startPaymentFlow(subscription.id).subscribe(
            payment => {
                this.overlayService.closeAll();
                this.storageService.payment = payment;
                this.navigationService.appendQueryParam({ status: 'PAID' });
            },
            err => this.onPaymentDeclinedError(err),
        );
    }

    private onPaymentDeclinedError(err: unknown) {
        if (this.isAndroidApp && (!(err instanceof DOMException) || !err.message.includes('RESULT_CANCELED'))) {
            this.showGooglePlayConnectionError();
        } else {
            this.overlayService.openOverlay(
                StandardOverlayComponent,
                {
                    title: 'paymentDeclinedOverlay.title',
                    message: 'paymentDeclinedOverlay.message',
                    primaryBtn: { title: 'main.close' },
                },
                () => this.back(),
            );
        }

        console.error(err);
    }

    private showGooglePlayConnectionError() {
        this.overlayService.openOverlay(
            StandardOverlayComponent,
            {
                title: 'googlePlayConnectionErrorOverlay.title',
                message: 'googlePlayConnectionErrorOverlay.message',
                primaryBtn: { title: 'main.close' },
            },
            () => this.back(),
        );
    }
}
