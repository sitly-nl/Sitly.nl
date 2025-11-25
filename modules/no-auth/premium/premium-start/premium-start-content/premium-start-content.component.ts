import { inject, Component, Output, OnInit, OnDestroy, EventEmitter, signal, computed } from '@angular/core';
import { BaseOverlayComponent } from 'app/components/common/overlay-content/base-overlay.component';
import { SubscriptionInterface } from 'app/models/api/subscription';
import { differenceInHours } from 'date-fns';
import { GooglePlayService } from 'app/services/google-play.service';
import { finalize, takeUntil } from 'rxjs/operators';
import { TranslateModule } from '@ngx-translate/core';
import { DecimalPipe } from '@angular/common';
import { SharedModule } from 'modules/shared/shared.module';
import { PremiumSwiperComponent } from 'app/components/premium-swiper/premium-swiper.component';
import { PremiumTextComponent } from 'app/components/premium-text/premium-text.component';
import { FeatureService } from 'app/services/feature.service';

@Component({
    selector: 'premium-start-content',
    templateUrl: './premium-start-content.component.html',
    styleUrls: ['./premium-start-content.component.less'],
    standalone: true,
    imports: [SharedModule, PremiumSwiperComponent, DecimalPipe, TranslateModule, PremiumTextComponent],
})
export class PremiumStartContentComponent extends BaseOverlayComponent implements OnInit, OnDestroy {
    @Output() onNext = new EventEmitter<SubscriptionInterface>();

    timeLeft = 24 - differenceInHours(new Date(), new Date(this.authUser?.created ?? ''));
    readonly featureService = inject(FeatureService);
    readonly subscriptions = computed(() =>
        this.isAndroidApp
            ? this.googlePlaySubscriptions()
            : this.webSubscriptions().map(subscription => {
                  subscription.coupon = this.countrySettings.coupons?.find(
                      coupon =>
                          coupon.subscriptionId === (subscription.id as never) &&
                          (!coupon.endDate || new Date(coupon.endDate) >= new Date()),
                  );
                  return subscription;
              }),
    );

    private readonly googlePlayService = inject(GooglePlayService);

    private readonly googlePlaySubscriptions = signal<SubscriptionInterface[]>([]);
    private readonly webSubscriptions = signal<SubscriptionInterface[]>([]);

    ngOnInit() {
        this.tryInitSubscriptions();
        this.countrySettingsService.changed.pipe(takeUntil(this.destroyed$)).subscribe(() => this.tryInitSubscriptions());
        const description = this.featureService.showPremiumOverlayNewDesign ? 'with-text' : 'with-slider';
        this.trackingService.trackCustomPageView('premium-overlay-start');
        this.trackingService.trackElementView({ category: 'premium', type: 'overlay', description });
    }

    selectSubscription(subscription: SubscriptionInterface) {
        this.storageService.subscription = subscription;
        this.onNext.emit(subscription);
    }

    private tryInitSubscriptions() {
        if (this.isAndroidApp && this.countrySettings.androidSubscriptions) {
            this.googlePlayService
                .getSubscriptions()
                .pipe(finalize(() => this.cd.markForCheck()))
                .subscribe(res => this.googlePlaySubscriptions.set(res));
        }

        if (!this.isAndroidApp && this.countrySettings.subscriptions) {
            this.webSubscriptions.set(this.countrySettings.subscriptions);
        }
    }
}
