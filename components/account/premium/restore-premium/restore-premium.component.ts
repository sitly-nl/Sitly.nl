import { Component, HostListener, inject } from '@angular/core';
import { BaseComponent } from 'app/components/base.component';
import { RouteType } from 'routing/route-type';
import { PaymentService } from 'app/services/api/payment.service';
import { AppEventService } from 'app/services/event.service';
import { GooglePlayService } from 'app/services/google-play.service';
import { CommonOverlayService } from 'app/services/overlay/common-overlay.service';
import { filter, switchMap } from 'rxjs/operators';

@Component({
    selector: 'restore-premium',
    template: '',
    standalone: true,
})
export class RestorePremiumComponent extends BaseComponent {
    private readonly googlePlayService = inject(GooglePlayService);
    private readonly paymentService = inject(PaymentService);
    private readonly commonOverlayService = inject(CommonOverlayService);
    private readonly eventService = inject(AppEventService);

    @HostListener('window:focus')
    onFocus() {
        this.tryRestorePremium();
    }

    @HostListener('window:pageshow')
    onShow() {
        this.tryRestorePremium();
    }

    private tryRestorePremium() {
        if (this.authUser.isPremium) {
            return;
        }

        this.googlePlayService
            .getPurchases()
            .pipe(filter(_ => this.routeService.routeType() !== RouteType.premiumStart && !this.authUser.isPremium))
            .subscribe(res => {
                if (res.length === 0) {
                    return;
                }

                const { itemId, purchaseToken } = res[0];
                this.verifyPayment(itemId, purchaseToken);
            });
    }

    private verifyPayment(itemId: string, purchaseToken: string) {
        this.paymentService
            .postGooglePayment(purchaseToken, 'com.sitly.app', itemId)
            .pipe(
                filter(res => res.data.status === 'PAID'),
                switchMap(_ => this.userService.refreshAuthUser()),
            )
            .subscribe(res => {
                if (res.data.isPremium) {
                    this.trackingService.trackPaymentStatus('paid');

                    this.commonOverlayService.showPremiumSuccessOverlay();
                    this.eventService.notifyPaymentComplete();
                }
            });
    }
}
