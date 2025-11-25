import { BaseApiModel } from 'app/models/api/response';

export enum PSPType {
    apple = 'apple',
    adyen = 'adyen',
    google = 'google',
}

export enum PaymentMethodType {
    welfareVoucher = 'welfare-voucher',
    creditcard = 'creditcard',
    ideal = 'ideal',
    paypal = 'paypal',
    bcmcMobile = 'bcmc_mobile',
    applePay = 'applepay',
    googlePay = 'paywithgoogle',
    sepa = 'sepadirectdebit',
}

export class Payment extends BaseApiModel {
    amount: number;
    created: Date;
    status: 'UNPAID' | 'PAID';
    psp?: PSPType;
}
