import { Component, EventEmitter, Output, Input } from '@angular/core';
import { BaseOverlayComponent } from 'app/components/common/overlay-content/base-overlay.component';
import { WinbackReason } from 'app/services/api/subscription.service';
import { SubscriptionInterface } from 'app/models/api/subscription';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';

@Component({
    selector: 'premium-winback',
    templateUrl: './premium-winback.component.html',
    styleUrls: ['./premium-winback.component.less'],
    standalone: true,
    imports: [SharedModule, TranslateModule],
})
export class PremiumWinbackComponent extends BaseOverlayComponent {
    @Output() cancelPremium = new EventEmitter();
    @Output() deleteAccount = new EventEmitter();
    @Output() enableDiscount = new EventEmitter();

    @Input() winbackTrigger: WinbackReason = 'deleteAccount';

    rating = 8.8; // hardcoded for now, since not all countries has ratings
    subscription: SubscriptionInterface;
    get discount() {
        return this.countrySettings?.winbackDiscountPercentage;
    }

    ngOnInit() {
        if (this.countrySettings) {
            this.subscription =
                this.authUser.subscription ??
                this.countrySettings.subscriptions.find(item => item.duration === 1) ??
                this.countrySettings.subscriptions[0];
        }

        this.data.set({
            title: 'premiumWinback.lifetimeDiscount.title.format',
            titleArgs: { amount: this.discount?.toString() },
            message: this.authUser.isParent
                ? 'premiumWinback.lifetimeDiscount.description.parents'
                : 'premiumWinback.lifetimeDiscount.description.fosters',
            primaryBtn: { title: 'premiumWinback.lifetimeDiscount.continue', action: () => this.enableDiscount.emit() },
            secondaryBtn: { title: 'main.back' },
            linkBtn:
                this.winbackTrigger === 'cancelPremium'
                    ? {
                          title: 'premiumWinback.lifetimeDiscount.cancelAnyway.premium',
                          action: () => this.cancelPremium.emit(),
                      }
                    : this.winbackTrigger === 'deleteAccount'
                      ? {
                            title: 'premiumWinback.lifetimeDiscount.cancelAnyway.account',
                            action: () => this.deleteAccount.emit(),
                        }
                      : undefined,
        });
    }
}
