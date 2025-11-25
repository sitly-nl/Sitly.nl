import { PaymentMethodType } from '../../models/payment.model';
import { UserRequest } from '../../services/auth.service';

export const allAdyenPaymentMethods = [PaymentMethodType.googlePay];

export function sanitizePayment(req: UserRequest) {
    if (req.body.iTunesReceipt) {
        req.checkBody('amount')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'amount is required when validating an iTunes receipt',
            })
            .isFloat()
            .withMessage({
                code: 'INVALID_FORMAT',
                title: 'amount must be a float',
            });
    } else if (req.body.googleReceipt) {
        // do nothing for now
    } else {
        req.checkBody('subscriptionId')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'subscriptionId is required',
            })
            .isInt()
            .withMessage({
                code: 'INVALID_FORMAT',
                title: 'subscriptionId must be an integer',
            });

        req.checkBody('paymentMethod')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'paymentMethod is required',
            })
            .isIn(allAdyenPaymentMethods)
            .withMessage({
                code: 'INVALID_VALUE',
                title: `paymentMethod can only be one of ${allAdyenPaymentMethods.join(', ')}`,
            });
    }
}
