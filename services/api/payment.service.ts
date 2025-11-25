import { map } from 'rxjs/operators';
import { ResponseParser } from 'app/parsers/response-parser';
import { ApiService } from 'app/services/api/api.service';
import { Injectable, inject } from '@angular/core';
import { Payment } from 'app/models/api/payment';
export interface SessionBody {
    returnUrl: string;
    subscriptionId: string;
}

@Injectable({
    providedIn: 'root',
})
export class PaymentService {
    private apiService = inject(ApiService);

    postPayment(
        subscriptionId: string,
        paymentMethod: string,
        paymentOptions: {
            socialSecurityNumber?: string;
            paymentMethodObj?: unknown;
        },
    ) {
        return this.apiService
            .post('/users/me/payments', {
                body: {
                    subscriptionId,
                    paymentMethod,
                    ...paymentOptions,
                },
            })
            .pipe(map(response => ResponseParser.parseObject<Payment>(response)));
    }

    postGooglePayment(purchaseToken: string, packageName: string, productId: string) {
        const body = {
            googleReceipt: {
                purchaseToken,
                packageName,
                productId,
                purchaseState: 0,
                quantity: 1,
                autoRenewing: true,
                acknowledged: false,
            },
        };
        return this.apiService.post('/users/me/payments', { body }).pipe(map(response => ResponseParser.parseObject<Payment>(response)));
    }

    resumePremium() {
        return this.apiService.post('/users/me/payments/resume').pipe(map(response => ResponseParser.parseObject<Payment>(response)));
    }

    payments() {
        return this.apiService.get('/users/me/payments').pipe(map(response => ResponseParser.parseObject<Payment[]>(response).data));
    }

    invoice(paymentId: string) {
        return this.apiService.get<Blob>(`/users/me/payments/${paymentId}/invoice`, { responseType: 'blob' });
    }

    validateVoucher(code: string) {
        return this.apiService.post('/users/me/validate-voucher', { body: { code } });
    }

    sessions(body: SessionBody) {
        return this.apiService.post<{ body: { amount: { value: number }; reference: string } }>('/payments/sessions', { body });
    }

    markPaymentAsProcessing(paymentId: string) {
        return this.apiService.patch(`/users/me/payments/${paymentId}`, { body: { type: 'setup_processing' } });
    }
}
