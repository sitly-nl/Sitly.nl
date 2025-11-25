import { CountryCode } from './../../models/brand-code';
import { Payment, PaymentMethodType } from './../../models/payment.model';
import { Environment } from './../env-settings.service';
import { request } from '../../utils/util';
import { ConfigInterface } from '../../../config/config-interface';
import { User } from '../../models/user/user.model';

export enum PaymentMethodCode {
    masterCard = 'mc',
    visa = 'visa',
    americanExpress = 'amex',
    elo = 'elo',
    welfareVoucher = 'welfare-voucher',
    ideal = 'ideal',
    paypal = 'paypal',
    bcmcMobile = 'bcmc_mobile',
    bcmc = 'bcmc',
    applePay = 'applepay',
    googlePay = 'paywithgoogle',
}

export class PaymentPayload {
    amount = {
        currency: this.brandConfigSettings.currencyCode,
        value: Math.round(this.payment.amount * 100),
    };
    reference = `${this.brandConfigSettings.countryCode.toUpperCase()}_${this.payment.instance_id}${
        Environment.isProd ? '' : Environment.isApiTests ? '_API-TEST' : '_TEST'
    }`;
    adyenMerchantAccount = this.brandConfigSettings.adyenMerchantAccount;
    countryCode = this.brandConfigSettings.countryCode;
    shopperEmail = this.user.email;
    shopperReference = `${this.brandConfigSettings.countryCode.toUpperCase()}_${this.user.webuser_id}`;
    get paymentMethod() {
        switch (this.type.paymentMethodType) {
            case 'recurring':
            case 'session':
                return undefined;
            default:
                return this.type.paymentMethod;
        }
    }

    constructor(
        private payment: Payment,
        private user: User,
        private brandConfigSettings: ConfigInterface,
        public type:
            | {
                  paymentMethodType: PaymentMethodType.googlePay;
                  paymentMethod: unknown;
                  socialSecurityNumber?: string;
              }
            | {
                  paymentMethodType: 'recurring';
              }
            | {
                  paymentMethodType: 'session';
                  returnUrl: string;
              },
    ) {}
}

interface PaymentValidationResult {
    pspReference: string;
    resultCode: string;
    merchantReference: string;
}

interface PaymentMethodsResponse {
    paymentMethods: PaymentMethod[];
    adyenResponse: unknown;
}

interface PaymentMethod {
    code: PaymentMethodCode;
    method: PaymentMethodType;
    name: string;
    paymentValidationAvailable: 0 | 1;
    configuration?: Record<string, unknown>;
}

interface AdyenPaymentMethod {
    type: 'scheme' | PaymentMethodCode;
    brands?: string[];
    name: string;
    configuration?: Record<string, unknown>;
}

export class AdyenService {
    static environment: 'default' | 'live' = Environment.apiKeys.adyen.config.live ? 'live' : 'default';
    static creditcardMethods = [
        { type: 'mc', name: 'MasterCard' },
        { type: 'visa', name: 'VISA' },
        { type: 'amex', name: 'American Express' },
        { type: 'elo', name: 'ELO' },
    ];
    static creditcardMethodsTypes = AdyenService.creditcardMethods.map(item => item.type);

    // ---- Checkout api ---- //
    private static checkoutUrl(endpoint: string) {
        return (
            (AdyenService.environment === 'live'
                ? Environment.apiKeys.adyen.config.checkout_api_url_live
                : Environment.apiKeys.adyen.config.checkout_api_url) +
            '/v68/' +
            endpoint
        );
    }

    private static checkoutHeaders() {
        return {
            'x-API-key': AdyenService.environment === 'live' ? Environment.apiKeys.adyen.api.key_live : Environment.apiKeys.adyen.api.key,
        };
    }

    static async sessions(input: PaymentPayload) {
        if (input.type.paymentMethodType !== 'session') {
            return;
        }

        return request({
            url: AdyenService.checkoutUrl('sessions'),
            method: 'POST',
            headers: AdyenService.checkoutHeaders(),
            json: {
                merchantAccount: input.adyenMerchantAccount,
                countryCode: input.countryCode.toUpperCase(),
                amount: input.amount,
                enableRecurring: true,
                reference: input.reference,
                returnUrl: input.type.returnUrl,
                shopperEmail: input.shopperEmail,
                shopperReference: input.shopperReference,
                blockedPaymentMethods: input.countryCode === CountryCode.brazil ? ['paywithgoogle'] : undefined,
            },
        });
    }

    static async getPaymentMethods(countryCode: CountryCode, currencyCode: string, adyenMerchantAccount: string) {
        const res = await request({
            url: AdyenService.checkoutUrl('paymentMethods'),
            method: 'POST',
            headers: AdyenService.checkoutHeaders(),
            json: {
                merchantAccount: adyenMerchantAccount,
                countryCode: countryCode.toUpperCase(),
                amount: {
                    currency: currencyCode,
                    value: 10000,
                },
            },
        });

        const paymentMethods = ((res.body?.paymentMethods as AdyenPaymentMethod[]) ?? [])
            .map(paymentMethod => {
                if (paymentMethod.type === 'scheme') {
                    return (paymentMethod.brands ?? [])
                        .filter(item => AdyenService.creditcardMethods.map(item => item.type).includes(item))
                        .map(item => {
                            return {
                                code: item,
                                method: PaymentMethodType.creditcard,
                                name: AdyenService.creditcardMethods.find(el => el.type === item)?.name,
                                paymentValidationAvailable: 1,
                            } as PaymentMethod;
                        });
                } else {
                    const validationAvailable =
                        paymentMethod.type === PaymentMethodCode.ideal || paymentMethod.type === PaymentMethodCode.paypal;
                    const method: PaymentMethod = {
                        code: paymentMethod.type,
                        method: paymentMethod.type as unknown as PaymentMethodType,
                        name: paymentMethod.name,
                        paymentValidationAvailable: validationAvailable ? 1 : 0,
                    };

                    if (paymentMethod.configuration) {
                        method.configuration = paymentMethod.configuration;
                    }
                    return method;
                }
            })
            .flatMap(i => i);
        const resObj: PaymentMethodsResponse = {
            paymentMethods,
            adyenResponse: res.body,
        };
        return resObj;
    }

    static async makePayment(input: PaymentPayload) {
        // We keep it only for GPay custom implementation in BR
        const json: Record<string, unknown> = {
            amount: input.amount,
            merchantAccount: input.adyenMerchantAccount,
            paymentMethod: input.paymentMethod,
            reference: input.reference,
            shopperEmail: input.shopperEmail,
            shopperReference: input.shopperReference,
            enableRecurring: true,
        };
        if (input.type.paymentMethodType === PaymentMethodType.googlePay && input.type.socialSecurityNumber) {
            json.socialSecurityNumber = input.type.socialSecurityNumber;
        }

        const res = await request({
            url: AdyenService.checkoutUrl('payments'),
            method: 'POST',
            headers: AdyenService.checkoutHeaders(),
            json,
        });
        const body = res.body as {
            resultCode: string;
            pspReference?: string;
            action?: {
                url: string;
            };
            message: unknown;
        };
        return {
            resultCode: body.resultCode,
            pspReference: body.pspReference,
            redirectUrl: body.action?.url,
            errorMessage: body.message,
        };
    }

    static async paymentDetails(redirectResult: string) {
        const res = await request({
            url: AdyenService.checkoutUrl('payments/details'),
            method: 'POST',
            headers: AdyenService.checkoutHeaders(),
            json: {
                details: { redirectResult },
            },
        });
        return res.body as PaymentValidationResult;
    }

    // ---- Classic api ---- //
    private static classicUrl(endpoint: string) {
        return Environment.apiKeys.adyen.config.classic_api_url + '/v50/' + endpoint;
    }

    static async makeRecurringPayment(input: PaymentPayload) {
        const res = await request({
            url: AdyenService.classicUrl('authorise'),
            method: 'POST',
            auth: {
                user: Environment.apiKeys.adyen.api.username,
                pass: Environment.apiKeys.adyen.api.password,
            },
            json: {
                amount: input.amount,
                reference: input.reference,
                merchantAccount: input.adyenMerchantAccount,
                shopperEmail: input.shopperEmail,
                shopperReference: input.shopperReference,
                shopperStatement: 'Sitly',
                recurring: {
                    contract: 'RECURRING',
                },
                selectedRecurringDetailReference: 'LATEST',
                shopperInteraction: 'ContAuth',
            },
        });

        const body = res.body as {
            additionalData?: {
                paymentMethod?: string;
                refusalReasonRaw: unknown;
            };
            message?: string;
            pspReference?: string;
            refusalReason?: string;
            resultCode?: string;
            status?: number;
        };
        const inputPaymentMethod = body.additionalData?.paymentMethod;
        let paymentMethod: PaymentMethodType | undefined;
        if (inputPaymentMethod) {
            paymentMethod = Object.values(PaymentMethodType).includes(inputPaymentMethod as never)
                ? paymentMethod
                : AdyenService.creditcardMethodsTypes.includes(inputPaymentMethod)
                  ? PaymentMethodType.creditcard
                  : undefined;
        }
        return {
            ...body,
            statusCode: body.status ?? 201,
            errorMessage: body.message,
            paymentMethod,
        };
    }
}
