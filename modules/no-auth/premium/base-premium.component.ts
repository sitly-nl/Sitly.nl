import { BaseComponent } from 'app/components/base.component';
import { inject, Component, OnInit } from '@angular/core';
import { PaymentService } from 'app/services/api/payment.service';
import { AppEventService } from 'app/services/event.service';
import { RouteType } from 'routing/route-type';
import { EventAction } from 'app/services/tracking/types';
import { PremiumService } from 'app/modules/premium/premium.service';
import { takeUntil } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';

@Component({
    template: '',
})
export abstract class BasePremiumComponent extends BaseComponent implements OnInit {
    readonly paymentService = inject(PaymentService);
    readonly eventService = inject(AppEventService);
    readonly premiumService = inject(PremiumService);
    readonly route = inject(ActivatedRoute);

    ngOnInit() {
        this.countrySettingsService.refreshCountrySettings().toPromise();
        this.premiumService.changed$.pipe(takeUntil(this.destroyed$)).subscribe(() => this.onSettingsReady());
        this.onSettingsReady();
    }

    closePremium() {
        this.navigationService.closeModal();
        this.trackPremiumCloseEvent();
    }

    protected onSettingsReady() {
        this.cd.markForCheck();
    }

    protected trackPremiumCloseEvent() {
        this.trackPremiumCtaEvent('select_close');
    }

    protected needTrackEvents() {
        return this.routeService.currentBaseRouteType() === RouteType.users || this.storageService.restoringRecurringPayment;
    }

    protected trackPremiumCtaEvent(event: string) {
        if (!this.needTrackEvents()) {
            return;
        }
        const premiumEventPrefix = this.storageService.restoringRecurringPayment
            ? 'monthly-payment-failed'
            : 'profilepage-click_message-premiumoverlay';
        const platformAware = premiumEventPrefix !== 'monthly-payment-failed';
        this.trackCtaEvent(`${premiumEventPrefix}-${event}`, EventAction.click, platformAware);
    }
}
