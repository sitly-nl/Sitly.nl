import { Component, OnInit, inject } from '@angular/core';
import { PaymentService } from 'app/services/api/payment.service';
import { Payment, PSPType } from 'app/models/api/payment';
import { finalize } from 'rxjs/operators';
import { BaseOverlayComponent } from 'app/components/common/overlay-content/base-overlay.component';
import { TranslateModule } from '@ngx-translate/core';
import { DatePipe } from '@angular/common';
import { SharedModule } from 'modules/shared/shared.module';

@Component({
    selector: 'invoices',
    templateUrl: './invoices.component.html',
    styleUrls: ['./invoices.component.less'],
    standalone: true,
    imports: [SharedModule, DatePipe, TranslateModule],
})
export class InvoicesComponent extends BaseOverlayComponent implements OnInit {
    readonly paymentService = inject(PaymentService);

    payments: Payment[] = [];
    downloadingInvoice?: Payment;

    ngOnInit() {
        this.data.set({
            title: 'invoices.title',
            secondaryBtn: { title: 'main.close' },
        });
        this.paymentService.payments().subscribe(res => {
            this.payments = res;
            this.cd.markForCheck();
        });
    }

    downloadInvoice(payment: Payment) {
        if (payment.psp === PSPType.apple || this.downloadingInvoice) {
            return;
        }

        this.downloadingInvoice = payment;
        this.paymentService
            .invoice(payment.id)
            .pipe(
                finalize(() => {
                    this.downloadingInvoice = undefined;
                    this.cd.markForCheck();
                }),
            )
            .subscribe(res => {
                const dataURL = window.URL.createObjectURL(res);

                const link = document.createElement('a');
                link.href = dataURL;
                link.download = 'invoice.pdf';
                // this is necessary as link.click() does not work on the latest Firefox
                link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));

                setTimeout(() => {
                    // For Firefox it is necessary to delay revoking the ObjectURL
                    window.URL.revokeObjectURL(dataURL);
                    link.remove();
                }, 100);
            });
    }
}
