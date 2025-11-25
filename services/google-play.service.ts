import { Injectable, inject } from '@angular/core';
import { Payment } from 'app/models/api/payment';
import { SubscriptionInterface } from 'app/models/api/subscription';
import { Observable, Subscriber } from 'rxjs';
import { PaymentService } from 'app/services/api/payment.service';
import { CountrySettingsService } from 'app/services/country-settings.service';
import { EnvironmentService } from 'app/services/environment.service';

@Injectable({
    providedIn: 'root',
})
export class GooglePlayService {
    private readonly paymentService = inject(PaymentService);
    private readonly countrySettingsService = inject(CountrySettingsService);
    private readonly environmentService = inject(EnvironmentService);

    getPurchases() {
        return new Observable<PurchaseDetails[]>(observer => {
            if (this.environmentService.isAndroidApp) {
                window
                    .getDigitalGoodsService('https://play.google.com/billing')
                    .then(service => {
                        service.listPurchases().then(list => {
                            observer.next(list);
                            observer.complete();
                        });
                    })
                    .catch(err => {
                        observer.error(err);
                        observer.complete();
                    });
            }
        });
    }

    getSubscriptions() {
        return new Observable<SubscriptionInterface[]>(observer => {
            try {
                if (this.environmentService.isAndroidApp) {
                    window
                        .getDigitalGoodsService('https://play.google.com/billing')
                        .then(service => {
                            service.getDetails(this.countrySettingsService.countrySettings?.androidSubscriptions ?? []).then(products => {
                                const subscriptions: SubscriptionInterface[] = products
                                    .sort((a, b) => parseFloat(a.price.value) - parseFloat(b.price.value))
                                    .map(p => {
                                        const duration = p.subscriptionPeriod === 'P3M' ? 3 : 1;
                                        return {
                                            id: p.itemId,
                                            durationUnit: 'months',
                                            duration,
                                            pricePerUnit: parseFloat(p.price.value) / duration,
                                        };
                                    });
                                observer.next(subscriptions);
                                observer.complete();
                            });
                        })
                        .catch(err => {
                            console.error('service error', err);
                            observer.error(err);
                            observer.complete();
                        });
                } else {
                    console.error('feature not available');
                    observer.error('FEATURE_NOT_AVAILABLE');
                    observer.complete();
                }
            } catch (error) {
                console.error('generic error', error);
                observer.error(error);
                observer.complete();
            }
        });
    }

    startPaymentFlow(productId: string) {
        return new Observable<Payment>(observer => {
            const paymentMethodData = [
                {
                    supportedMethods: 'https://play.google.com/billing',
                    data: {
                        sku: productId,
                    },
                },
            ];

            try {
                const request = new PaymentRequest(paymentMethodData, undefined as never);
                request
                    .show()
                    .then(res => this.onGooglePlayPaymentResponse(observer, res, productId))
                    .catch(err => {
                        console.error(err);
                        observer.error(err);
                        observer.complete();
                    });
            } catch (err) {
                console.error('Google Play error:', err);
                observer.error(err);
                observer.complete();
            }
        });
    }

    private onGooglePlayPaymentResponse(observer: Subscriber<Payment>, response: PaymentResponse, productId: string) {
        const { purchaseToken } = response.details as { purchaseToken: string };
        this.paymentService.postGooglePayment(purchaseToken, 'com.sitly.app', productId).subscribe(
            res => {
                if (res.data.status === 'PAID') {
                    response.complete('success');
                    observer.next(res.data);
                    observer.complete();
                } else {
                    response.complete('fail');
                    observer.error('PAYMENT_NOT_CONFIRMED');
                }
            },
            err => {
                response.complete('fail');
                observer.error(err);
            },
        );
    }
}
