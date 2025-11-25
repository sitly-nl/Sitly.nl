import { Component, ChangeDetectionStrategy, HostListener, OnInit, inject } from '@angular/core';
import { RouteType } from 'routing/route-type';
import { BasePremiumComponent } from 'app/modules/premium/base-premium.component';
import { Params, RouterOutlet } from '@angular/router';
import { takeUntil } from 'rxjs/operators';
import { EventAction } from 'app/services/tracking/types';
import { Observable } from 'rxjs';
import { StandardOverlayComponent } from 'app/components/common/overlay-content/standard-overlay/standard-overlay.component';
import { CommonOverlayService } from 'app/services/overlay/common-overlay.service';
import { SharedModule } from 'modules/shared/shared.module';

@Component({
    selector: 'premium-overlay',
    templateUrl: 'premium.component.html',
    styleUrls: ['./premium.component.less'],
    changeDetection: ChangeDetectionStrategy.Default,
    standalone: true,
    imports: [RouterOutlet, SharedModule],
})
export class PremiumComponent extends BasePremiumComponent implements OnInit {
    private _state: 'normal' | 'pending' | 'pendingTimeout' = 'normal';
    get state() {
        return this._state;
    }
    set state(newValue) {
        if (this._state !== newValue) {
            this._state = newValue;

            if (this._state === 'pendingTimeout') {
                this.overlayService.openOverlay(
                    StandardOverlayComponent,
                    {
                        title: 'premium.paymentProcessing.title',
                        message: 'premium.paymentProcessing.description',
                        primaryBtn: { title: 'main.close' },
                    },
                    () => {
                        this.trackingService.trackClickEvent({
                            category: 'premium',
                            type: 'button',
                            description: 'payment-pending-timeout-confirm',
                        });
                        this.closePremium();
                    },
                );
            }
        }
    }

    private readonly commonOverlayService = inject(CommonOverlayService);

    ngOnInit() {
        this.premiumService.start(this.countrySettings);

        this.route.queryParams.pipe(takeUntil(this.destroyed$)).subscribe((queryParams: Params) => {
            if (queryParams.status === 'PAID') {
                this.onPaid();
            } else if (queryParams.status === 'PENDING') {
                this.trackingService.trackPaymentStatus('pending');
                this.trackingService.trackElementView({ category: 'premium', type: 'prompt', description: 'payment-pending' });
                this.state = 'pending';

                this.userService.refreshAuthUser(true).subscribe(() => {
                    if (this.authUser.isPremium) {
                        this.onPaid();
                    } else {
                        this.navigationService.appendQueryParam({ status: 'PENDING_TIMEOUT' });
                    }
                });
            } else if (queryParams.status === 'PENDING_TIMEOUT') {
                this.trackingService.trackPaymentStatus('pending-timeout');
                this.trackingService.trackElementView({ category: 'premium', type: 'prompt', description: 'payment-pending-timeout' });
                this.state = 'pendingTimeout';
            }
        });

        if (this.storageService.restoringRecurringPayment) {
            this.trackCtaEvent('monthly-payment-failed_prompt', EventAction.open, false);
            this.trackingService.trackPaymentStatus('monthly-failed');
        }
    }

    @HostListener('document:keydown.escape', ['$event']) onKeydownHandler(_event: KeyboardEvent) {
        this.closePremiumIfAllowed();
    }

    private onPaid() {
        this.closePremium();

        this.trackingService.trackPaymentStatus('paid');
        this.trackingService.trackElementView({ category: 'premium', type: 'prompt', description: 'payment-paid' });
        this.cd.detectChanges();

        const paymentToHandle = this.storageService.payment;
        if (paymentToHandle) {
            this.storageService.payment = undefined;
            this.updateUserIfNotPremium().subscribe(_ => {
                const subscription = this.authUser?.subscription;
                if (subscription) {
                    const productName = `${subscription.duration}M-${subscription.pricePerUnit}E`;
                    this.trackingService.trackPayment(
                        paymentToHandle.id,
                        subscription.id,
                        paymentToHandle.amount,
                        productName,
                        this.countrySettings.currencyCode,
                    );
                }
                this.trackCtaEvent(
                    this.authUser.isParent ? 'premium_success_parent' : 'premium_success_sitter',
                    EventAction.premiumSuccess,
                    false,
                );

                this.commonOverlayService.showPremiumSuccessOverlay();
                this.eventService.notifyPaymentComplete();
            });
        }

        this.cd.markForCheck();
    }

    private updateUserIfNotPremium() {
        return this.authUser.isPremium
            ? new Observable(observer => {
                  observer.next(this.authUser);
                  observer.complete();
              })
            : this.userService.refreshAuthUser();
    }

    private closePremiumIfAllowed() {
        if (this.routeService.routeType() === RouteType.premiumStart && this.state === 'normal') {
            this.closePremium();
        }
    }

    protected trackPremiumCloseEvent() {
        const isPremiumStartScreen = this.route.snapshot.children[0].routeConfig?.path === RouteType.premiumStart;
        if (this.state === 'normal') {
            this.trackPremiumCtaEvent(isPremiumStartScreen ? 'select_close' : 'select_continue-select_close');
        }
    }
}
