import { BaseComponent } from 'app/components/base.component';
import { inject, Component, Output, EventEmitter } from '@angular/core';
import { PaymentService } from 'app/services/api/payment.service';
import { switchMap } from 'rxjs/operators';
import { TranslateModule } from '@ngx-translate/core';
import { FormatPipeModule } from 'ngx-date-fns';
import { SharedModule } from 'modules/shared/shared.module';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'voucher',
    templateUrl: './voucher.component.html',
    styleUrls: ['./voucher.component.less'],
    standalone: true,
    imports: [FormsModule, SharedModule, FormatPipeModule, TranslateModule],
})
export class VoucherComponent extends BaseComponent {
    readonly paymentService = inject(PaymentService);

    @Output() readonly close = new EventEmitter();

    premiumActivated = false;
    showError = false;
    code = '';

    validateCode() {
        if (!this.code) {
            return;
        }

        this.showError = false;
        this.paymentService
            .validateVoucher(this.code)
            .pipe(switchMap(_ => this.userService.refreshAuthUser()))
            .subscribe(
                _ => {
                    this.premiumActivated = true;
                    this.cd.markForCheck();
                },
                _ => {
                    this.showError = true;
                    this.cd.markForCheck();
                },
            );
    }

    onClose() {
        this.close.emit();
    }
}
