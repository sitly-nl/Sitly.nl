import { Response } from 'express';
import googleVerifier, { SubscriptionReceipt } from 'google-play-billing-validator';
import * as moment from 'moment';
import { PaymentMethodType, PSP } from '../../models/payment.model';
import { UserRequest } from '../../services/auth.service';
import { capturePaymentError, forbiddenError, unprocessableEntityError } from '../../services/errors';
import { LogService } from '../../services/log.service';
import { PaymentsRoute } from './payments';
import { SitlyRouter } from '../sitly-router';
import { sanitizePayment } from './payment-sanitization';
import { config } from '../../../config/config';
import { AdyenService, PaymentPayload } from '../../services/payments/adyen.service';
import { serialize } from '../../models/serialize/payment-response';
import { AppleReceiptService } from '../../services/payments/apple-receipt.service';
import { getModels } from '../../sequelize-connections';
import { PaymentType } from '../../models/payment-types';
import { isAfter } from 'date-fns';
import { optionalAwait } from '../../utils/util';
import { TrackingService } from '../../services/tracking.service';
import { Environment } from '../../services/env-settings.service';
import { GoogleVerificationResult } from '../../services/google.service';

export class PaymentsCreateRoute extends PaymentsRoute {
    static create(router: SitlyRouter) {
        router.post<UserRequest>('/users/me/payments', async (req, res) => {
            const paymentRouter = new PaymentsCreateRoute();

            sanitizePayment(req);
            const validationErrors = await paymentRouter.handleValidationResult(req, res);
            if (validationErrors) {
                if (req.body.iTunesReceipt) {
                    LogService.logRequest({ req, label: 'payment.ITunesReceipt.error.sanitize', details: validationErrors });
                }
                return;
            }

            if (req.user.isPremium) {
                return forbiddenError({ res, title: 'New payment can not be initiated by premium user' });
            }

            if (req.body.paymentMethod === PaymentMethodType.googlePay) {
                return paymentRouter.processGooglePay(req, res);
            } else if (req.body.iTunesReceipt) {
                LogService.logRequest({ req, label: 'payment.post.iTunesReceipt' });
                return paymentRouter.processITunesReceipt(req, res);
            } else if (req.body.googleReceipt) {
                LogService.logRequest({ req, label: 'payment.post.googleReceipt' });
                return paymentRouter.processGoogleReceipt(req, res);
            } else {
                unprocessableEntityError({ res, title: 'Unsupported body content' });
            }
        });
    }

    private async processGooglePay(req: UserRequest, res: Response) {
        const paymentMethod = PaymentMethodType.googlePay;
        LogService.logRequest({ req, label: `payment.post.${paymentMethod}` });

        try {
            const payment = await this.createPayment(req, res);
            if (!payment) {
                return;
            }

            const brandConfigSettings = config.getConfig(req.brandCode);
            const paymentPayload = new PaymentPayload(payment, req.user, brandConfigSettings, {
                paymentMethodType: paymentMethod,
                paymentMethod: req.body.paymentMethodObj,
                socialSecurityNumber: req.body.socialSecurityNumber as string,
            });

            const status = await AdyenService.makePayment(paymentPayload);
            if (status.resultCode !== 'Authorised') {
                const message = (status.errorMessage as string) ?? '';
                unprocessableEntityError({ res, title: message });
                LogService.logRequest({ req, label: `payment.adyen.${paymentMethod}.error`, message });
                return;
            }

            await this.handleSuccessfulPayment(payment, { psp_reference: status.pspReference ?? '' });
            LogService.logRequest({
                req,
                label: `payment.adyen.${paymentMethod}.successful`,
                message: `amount=${payment.amount} ${brandConfigSettings.currencyCode}`,
            });
            res.status(201).json(serialize(payment));
        } catch (err) {
            LogService.logRequest({ req, label: `payment.adyen.${paymentMethod}.error.server`, message: '' });
            return this.serverError(req, res, err as Error);
        }
    }

    private async processITunesReceipt(req: UserRequest, res: Response) {
        const amount = req.body.amount as number;
        try {
            const receiptData = await AppleReceiptService.getReceiptData(req.body.iTunesReceipt);
            const latestTransaction = receiptData?.lastTransaction;
            if (latestTransaction) {
                const models = getModels(req.brandCode);
                const originalTransactionId = latestTransaction.original_transaction_id;
                const latestTransactionId = latestTransaction.transaction_id;

                if (PaymentsRoute.blockedUsersITunesTransactionIds.includes(originalTransactionId)) {
                    return forbiddenError({ res });
                }

                let payment = await models.Payment.byPspReference(latestTransactionId);

                if (payment && payment.webuser_id !== req.user.webuser_id) {
                    const user = await models.User.byId(payment.webuser_id, { includeDeleted: true });
                    if (!user?.customUser.deleted) {
                        LogService.logRequest({ req, label: 'payment.ITunesReceipt.error.receiptBelongToDifferentUser' });
                        return forbiddenError({ res, title: 'This is not yours' });
                    }
                }

                if (!payment) {
                    payment = models.Payment.build();
                }

                try {
                    await payment.update({
                        order_type: latestTransactionId === originalTransactionId ? PaymentType.initial : PaymentType.recurring,
                        webuser_id: req.user.webuser_id,
                        amount,
                        psp: PSP.apple,
                        paid: 1,
                        psp_reference: latestTransactionId,
                        created: payment.created ?? new Date(),
                    });
                } catch (error) {
                    LogService.logRequest({ req, label: 'payment.ITunesReceipt.error.savePayment', message: (error as Error).toString() });
                    return this.serverError(req, res, error as Error);
                }

                this.trackFacebookPremiumPurchase(req, req.user, payment);

                if (receiptData?.expiryDate) {
                    const user = await models.User.byId(req.user.webuser_id);
                    if (user) {
                        let premiumEnds = receiptData.expiryDate.toDate();
                        const userPremium = user.customUser.premium;
                        if (userPremium && isAfter(userPremium, premiumEnds)) {
                            premiumEnds = userPremium;
                        }
                        try {
                            const previousPremium = user.customUser.premium;
                            await user.customUser.update({
                                subscription_id: null,
                                subscription_cancelled: 0,
                                premium: premiumEnds,
                            });
                            await optionalAwait(TrackingService.trackUserPremiumStatusChange(user, previousPremium));
                        } catch (error) {
                            LogService.logRequest({
                                req,
                                label: 'payment.ITunesReceipt.error.saveUser',
                                message: (error as Error).toString(),
                            });
                            return this.serverError(req, res, error as Error);
                        }
                    }
                    LogService.logRequest({
                        req,
                        label: 'payment.post.iTunesReceipt.success',
                        message: '',
                        details: {
                            expiryDate: receiptData.expiryDate,
                            payment: payment.toJSON(),
                            user_id: user?.webuser_id ?? '<user was not found>',
                        },
                    });
                    res.status(201).json(serialize(payment));
                } else {
                    LogService.logRequest({ req, label: 'payment.ITunesReceipt.error', message: 'Invalid expiry date in receipt' });
                    unprocessableEntityError({ res, title: 'Invalid expiry date in receipt' });
                }
            } else {
                LogService.logRequest({ req, label: 'payment.ITunesReceipt.error', message: 'Missing transaction' });
                unprocessableEntityError({ res, title: 'Missing transaction' });
            }
        } catch (error) {
            capturePaymentError(req, error as Error);
            LogService.logRequest({
                req,
                label: 'payment.ITunesReceipt.error.general',
                message: (error as Error).toString() ?? '<< some undefined error >>',
            });
            unprocessableEntityError({ res, title: 'Invalid receipt provided' });
        }
    }

    private async processGoogleReceipt(req: UserRequest, res: Response) {
        const receipt = req.body.googleReceipt as SubscriptionReceipt;
        try {
            const purchaseToken = receipt.purchaseToken;
            // verifySub without developerPayload deleted does an acknowledge request, it is needed so payments won't be cancelled/refunded
            receipt.developerPayload = '';
            const verifier = new googleVerifier({
                email: Environment.apiKeys.googleapis.client_email,
                key: Environment.apiKeys.googleapis.private_key,
            });
            verifier.verifySub(receipt).catch((_: unknown) => {});
            delete receipt.developerPayload;
            try {
                const verificationResult = (await verifier.verifySub(receipt)) as GoogleVerificationResult;
                const isSuccessful = verificationResult.isSuccessful;
                if (isSuccessful && verificationResult.payload) {
                    const models = getModels(req.brandCode);
                    const expiryDateStr = verificationResult.payload.expiryTimeMillis;
                    const amount = verificationResult.payload.priceAmountMicros / 1000000;

                    const pspReference = verificationResult.payload.orderId;

                    const existingPayment = await models.Payment.byPspReference(pspReference);
                    if (existingPayment) {
                        return unprocessableEntityError({
                            res,
                            title: 'This receipt has already been processed',
                            code: 'ALREADY_PROCESSED',
                        });
                    }
                    const subscriptionId = receipt.productId;

                    let payment;
                    try {
                        payment = await models.Payment.create({
                            order_type: PaymentType.initial,
                            webuser_id: req.user.webuser_id,
                            amount,
                            psp: PSP.google,
                            paid: 1,
                            psp_reference: pspReference,
                            created: new Date(),
                            extra_info: JSON.stringify({
                                purchaseToken,
                                subscriptionId,
                            }),
                        });
                    } catch (error) {
                        LogService.logRequest({
                            req,
                            label: 'payment.googleReceipt.error.savePayment',
                            message: (error as Error).toString(),
                        });
                        return this.serverError(req, res, error as Error);
                    }

                    this.trackFacebookPremiumPurchase(req, req.user, payment);

                    const expiryDateMoment = moment(expiryDateStr, 'x');
                    const expiryDate = expiryDateMoment.toDate();

                    if (expiryDate) {
                        const user = await models.User.byId(req.user.webuser_id);
                        if (user) {
                            user.customUser.subscription_id = null;
                            user.customUser.subscription_cancelled = 0;
                            const oldPremiumExpiryDateISO = user.customUser?.premium;
                            if (!oldPremiumExpiryDateISO || moment(oldPremiumExpiryDateISO).isBefore(expiryDateMoment)) {
                                user.customUser.premium = expiryDate;
                            }
                            try {
                                const previousPremium = user.customUser.premium;
                                await user.customUser.save();
                                await optionalAwait(TrackingService.trackUserPremiumStatusChange(user, previousPremium));
                            } catch (error) {
                                LogService.logRequest({
                                    req,
                                    label: 'payment.googleReceipt.error.saveUser',
                                    message: (error as Error).toString(),
                                });
                                return this.serverError(req, res, error as Error);
                            }
                        }
                        LogService.logRequest({
                            req,
                            label: 'payment.post.googleReceipt.success',
                            message: '',
                            details: {
                                expiryDate,
                                payment: payment.toJSON(),
                                user_id: user ? user.webuser_id : '<user was not found>',
                            },
                        });
                        res.status(201).json(serialize(payment));
                    } else {
                        LogService.logRequest({ req, label: 'payment.googleReceipt.error', message: 'Invalid expiry date in receipt' });
                        unprocessableEntityError({ res, title: 'Invalid expiry date in receipt' });
                    }
                }
            } catch (error) {
                LogService.logRequest({ req, label: 'payment.googleReceipt.error.general', message: (error as Error).toString() });
                unprocessableEntityError({ res, title: 'Invalid receipt provided' });
            }
        } catch (error) {
            capturePaymentError(req, error as Error);
            LogService.logRequest({ req, label: 'payment.googleReceipt.error.general', message: (error as Error).toString() });
            unprocessableEntityError({ res, title: 'Invalid receipt provided' });
        }
    }
}
