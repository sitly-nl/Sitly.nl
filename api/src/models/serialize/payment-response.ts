import { Payment } from '../payment.model';
import { Serializer as JSONAPISerializer } from 'jsonapi-serializer';

export class PaymentResponse {
    static keys: (keyof PaymentResponse)[] = [
        'id',
        'orderType',
        'amount',
        'created',
        'pspReference',
        'psp',
        'paymentMethod',
        'refunded',
        'chargebackTime',
        'status',
    ];

    id = this.payment.instance_id;
    orderType = this.payment.order_type;
    amount = this.payment.amount;
    created = this.payment.created.toISOString();
    pspReference = this.payment.psp_reference;
    psp = this.payment.psp;
    paymentMethod = this.payment.payment_method;
    refunded = this.payment.refunded;
    chargebackTime = this.payment.chargeback_time?.toISOString() ?? null;
    status = this.payment.paid === 1 ? 'PAID' : 'UNPAID';

    private constructor(private payment: Payment) {}

    static instance(payment: Payment) {
        return new PaymentResponse(payment);
    }
}

export const serialize = (data: Payment | Payment[]) => {
    const serializer = new JSONAPISerializer('payments', {
        attributes: PaymentResponse.keys,
        keyForAttribute: 'camelCase',
    });
    return serializer.serialize(Array.isArray(data) ? data.map(item => PaymentResponse.instance(item)) : PaymentResponse.instance(data));
};
