import { Component, Input, signal } from '@angular/core';

@Component({
    selector: 'premium-terms',
    templateUrl: './premium-terms.component.html',
    styleUrl: './premium-terms.component.less',
})
export class PremiumTermsComponent {
    @Input() recurringPayment = false;
    @Input() renewDate?: Date;
    readonly termsDisplayed = signal(false);
}
