import { inject, Component, ElementRef, ViewChild } from '@angular/core';
import { RouteType } from 'routing/route-type';
import { BasePremiumComponent } from 'app/modules/premium/base-premium.component';
import { ActivatedRoute } from '@angular/router';
import { takeUntil } from 'rxjs/operators';
import AdyenCheckout from '@adyen/adyen-web';
import DropinElement from '@adyen/adyen-web/dist/types/components/Dropin';
import { CheckoutSessionPaymentResponse } from '@adyen/adyen-web/dist/types/types';
import { FormControl, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GooglePayProps } from '@adyen/adyen-web/dist/types/components/GooglePay/types';
import UIElement from '@adyen/adyen-web/dist/types/components/UIElement';
import { PaymentMethodType } from 'app/models/api/payment';
import { add } from 'date-fns/esm';
import { ToolbarItem } from 'modules/shared/components/toolbar/toolbar.component';
import { FeatureService } from 'app/services/feature.service';
import { environment } from 'environments/environment';
import { TranslateModule } from '@ngx-translate/core';
import { DecimalPipe } from '@angular/common';
import { SharedModule } from 'modules/shared/shared.module';

@Component({
    selector: 'payment-methods',
    templateUrl: './payment-methods.component.html',
    styleUrls: ['./payment-methods.component.less'],
    standalone: true,
    imports: [SharedModule, FormsModule, ReactiveFormsModule, DecimalPipe, TranslateModule],
})
export class PaymentMethodsComponent extends BasePremiumComponent {
    readonly route = inject(ActivatedRoute);
    readonly featureService = inject(FeatureService);

    rating = 8.8; // hardcoded for now
    showErrorOfType?: 'initialPayment' | 'recurringPayment';
    renewDate: Date | undefined;
    termsDisplayed = false;
    googlePayMethod = this.countrySettings.paymentMethodsAdyen?.paymentMethods?.find(item => {
        return item.type === PaymentMethodType.googlePay;
    });
    expandedGooglePay = false;
    customGooglePayFlow = this.countrySettings.countryCode === 'br';
    get socialSecurityNumberControl() {
        return this.cardForm.controls.socialSecurityNumber;
    }
    get subscription() {
        return this.premiumService.subscription;
    }

    cardForm = new FormGroup({
        socialSecurityNumber: new FormControl('', {
            validators: [Validators.required, Validators.minLength(10), Validators.pattern('\\d*')],
            updateOn: 'blur',
        }),
    });
    ToolbarItem = ToolbarItem;

    @ViewChild('hook', { static: true }) hook = new ElementRef('');
    @ViewChild('socialSecurityNumberInput') socialSecurityNumberInput: ElementRef<HTMLInputElement>;

    private testEnv = environment.name !== 'production';

    ngOnInit() {
        super.ngOnInit();

        if (!this.subscription) {
            this.navigationService.navigate(RouteType.premiumStart);
            return;
        }

        this.renewDate = add(Date.now(), { [this.subscription.durationUnit]: this.subscription.duration });

        if (this.storageService.restoringRecurringPayment) {
            this.showErrorOfType = 'recurringPayment';
            this.storageService.restoringRecurringPayment = false;
        }

        this.route.queryParams.pipe(takeUntil(this.destroyed$)).subscribe(queryParams => {
            if (queryParams.status === 'UNPAID') {
                this.trackingService.trackCustomPageView('transaction-failed');
                this.trackingService.trackPaymentStatus('unpaid');
                this.showErrorOfType = 'initialPayment';
                this.cd.markForCheck();
            }
        });

        if (this.customGooglePayFlow) {
            this.configureGooglePay().then();
        }

        const returnUrl = window.location.href.split('?')[0];
        const trackingService = this.trackingService;
        this.paymentService.sessions({ returnUrl, subscriptionId: this.subscription.id }).subscribe(res => {
            this.storageService.payment = {
                id: res.body.reference.split('_')[1],
                amount: res.body.amount.value / 100,
            };
            this.getAdyenCheckoutForSession(res.body).then(checkout => {
                checkout
                    .create('dropin', {
                        openFirstPaymentMethod: false,
                        openFirstStoredPaymentMethod: false,
                        onSelect(paymentMethod: { props?: { name?: string } }) {
                            const vendor = paymentMethod?.props?.name ?? 'NA';
                            trackingService?.trackClickEvent({
                                category: 'premium',
                                type: 'button',
                                description: `payment-method-select-${vendor}`,
                            });
                        },
                    })
                    .mount(this.hook.nativeElement);
            });
        });

        this.trackingService.trackElementView({ category: 'premium', type: 'overlay', description: 'payment-methods' });
    }

    onToolbarItemSelected(item: ToolbarItem) {
        switch (item) {
            case ToolbarItem.back:
                this.trackingService.trackClickEvent({
                    category: 'premium',
                    type: 'button',
                    description: 'payment-methods-back',
                });
                if (!this.navigationService.hasHistory) {
                    this.navigationService.clearHistory();
                    this.navigationService.navigate(RouteType.premiumStart);
                } else {
                    super.back();
                }
                break;
            case ToolbarItem.close:
                this.closePremium();
                break;
        }
    }

    private async getAdyenCheckoutForSession(session: unknown) {
        return AdyenCheckout({
            clientKey: this.testEnv ? 'test_B67NUSPMU5BVVKHZQP727IMM24UQDGWS' : 'live_SCBEYF7EYBHKTOYWKG5ISPM2CYQHAYY2',
            environment: this.testEnv ? 'test' : 'live',
            locale: this.localeService.getLocaleCode(),
            session,
            paymentMethodsConfiguration: {
                ideal: {
                    beforeSubmit: ((data: unknown, _element: UIElement, action: { resolve: (data: unknown) => void }) => {
                        this.trackingService?.trackPayClick('ideal');
                        action.resolve(data);
                    }) as never,
                },
                card: {
                    configuration: {
                        socialSecurityNumberMode: this.countrySettings.countryCode === 'br' ? 'show' : 'auto',
                    },
                    hasHolderName: true,
                    holderNameRequired: true,
                    beforeSubmit: ((data: unknown, _element: UIElement, action: { resolve: (data: unknown) => void }) => {
                        this.trackingService?.trackPayClick('card');
                        action.resolve(data);
                    }) as never,
                },
                paypal: {
                    onClick: () => {
                        this.trackingService?.trackPayClick('paypal');
                    },
                },
                paywithgoogle: {
                    callbackIntents: ['PAYMENT_AUTHORIZATION'],
                    paymentDataCallbacks: {
                        onPaymentAuthorized: () => {
                            return { transactionState: 'SUCCESS' };
                        },
                    },
                    onClick: (resolve: () => void) => {
                        this.trackingService?.trackPayClick('google');
                        resolve();
                    },
                },
                applepay: {
                    onClick: (resolve: () => void) => {
                        this.trackingService?.trackPayClick('apple');
                        resolve();
                    },
                },
                bcmc: {
                    beforeSubmit: ((data: unknown, _element: UIElement, action: { resolve: (data: unknown) => void }) => {
                        this.trackingService?.trackPayClick('bancontact');
                        action.resolve(data);
                    }) as never,
                },
                sepadirectdebit: {
                    beforeSubmit: (data: unknown, _element: UIElement, action: { resolve: (data: unknown) => void }) => {
                        this.trackingService?.trackPayClick('sepadirectdebit');
                        action.resolve(data);
                    },
                },
            },
            onPaymentCompleted: (res: CheckoutSessionPaymentResponse, component: DropinElement) => {
                if (res.action != null) {
                    component.handleAction(res.action);
                } else {
                    switch (res.resultCode) {
                        case 'Authorised':
                        case 'Pending':
                        case 'Received':
                            if (this.storageService.payment) {
                                this.paymentService.markPaymentAsProcessing(this.storageService.payment?.id).subscribe();
                            }
                            this.navigationService.appendQueryParam({ status: 'PENDING' });
                            break;
                        default:
                            this.navigationService.appendQueryParam({ status: 'UNPAID' });
                            break;
                    }
                }
            },
            onError: (error: Error, component: DropinElement) => {
                console.error('error=', error.name, error.message, error.stack, component);
                if (error.message === 'The session has expired.') {
                    this.restart();
                }
            },
        });
    }

    restart() {
        this.navigationService.reload();
    }

    private async configureGooglePay() {
        if (!this.googlePayMethod) {
            return;
        }

        const config = {
            paymentMethodsResponse: this.countrySettings.paymentMethodsAdyen,
            clientKey: this.testEnv ? 'test_B67NUSPMU5BVVKHZQP727IMM24UQDGWS' : 'live_SCBEYF7EYBHKTOYWKG5ISPM2CYQHAYY2',
            environment: this.testEnv ? 'test' : 'live',
            locale: this.localeService.getLocaleCode(),
        };
        const checkout = await AdyenCheckout(config);
        const googlePay = checkout.create('paywithgoogle', {
            environment: this.testEnv ? 'TEST' : 'PRODUCTION',
            amount: {
                currency: this.countrySettings.currencyCode,
                value: this.subscription.pricePerUnit * this.subscription.duration * 100,
            },
            countryCode: this.countrySettings.countryCode,
            buttonColor: 'black',
            buttonSizeMode: 'fill',
            callbackIntents: ['PAYMENT_AUTHORIZATION'],
            paymentDataCallbacks: {
                onPaymentAuthorized: () => {
                    return { transactionState: 'SUCCESS' };
                },
            },
            onClick: (resolve: () => void) => {
                this.socialSecurityNumberControl?.markAsDirty();
                this.cd.markForCheck();
                if (this.socialSecurityNumberControl.valid) {
                    resolve();
                }
            },
            onChange: (state: { isValid: unknown; data: { paymentMethod: unknown } }, _component: unknown) => {
                if (state.isValid) {
                    this.paymentService
                        .postPayment(this.subscription.id, 'paywithgoogle', {
                            paymentMethodObj: state.data?.paymentMethod,
                            socialSecurityNumber: this.socialSecurityNumberInput.nativeElement.value,
                        })
                        .subscribe(res => {
                            const payment = res.data;
                            this.storageService.payment = payment;

                            if (payment?.status === 'PAID') {
                                this.navigationService.appendQueryParam({ status: 'PAID' });
                            } else {
                                this.navigationService.appendQueryParam({ status: 'UNPAID' });
                            }
                        });
                }
            },
        } as GooglePayProps);
        googlePay
            .isAvailable()
            .then(() => {
                googlePay.mount('#googlepay-container');
            })
            .catch((err: Error) => {
                console.log('Google Pay is not available ', err.name, err.message);
            });
    }

    protected trackPremiumCloseEvent() {
        this.trackPremiumCtaEvent('select_continue-select_close');
    }
}
