import { AppleNotificationLatestReceiptInfo, AppleReceiptService } from '../../services/payments/apple-receipt.service';
import { PaymentType } from './../../models/payment-types';
import { SitlyRouter } from './../sitly-router';
import { NextFunction, Request, Response } from 'express';
import { writeFile } from 'fs';
import { BrandCode } from '../../models/brand-code';
import { Payment, PaymentMethodType, PSP } from '../../models/payment.model';
import { PaymentsRoute } from './payments';
import * as auth from 'basic-auth';
import { Error as JSONAPIError } from 'jsonapi-serializer';
import { LogService } from '../../services/log.service';
import * as moment from 'moment';
import { Environment } from '../../services/env-settings.service';
import { Util, optionalAwait } from '../../utils/util';
import { capturePaymentError, unauthorized } from '../../services/errors';
import googleVerifier from 'google-play-billing-validator';
import { getMainModels, getModels } from '../../sequelize-connections';
import { TrackingService } from '../../services/tracking.service';
import { add } from 'date-fns';
import { GoogleVerificationResult } from '../../services/google.service';

enum AppleNotificationType {
    renewal = 'RENEWAL',
    interactiveRenewal = 'INTERACTIVE_RENEWAL',
    didChangeRenewalStatus = 'DID_CHANGE_RENEWAL_STATUS',
    didRenew = 'DID_RENEW',
    cancel = 'CANCEL',
}

export interface AppleNotificationUnifiedReceipt {
    latest_receipt_info: AppleNotificationLatestReceiptInfo[];
    receipt?: unknown;
    status?: number;
}
interface AppleNotificationBody {
    notification_type: AppleNotificationType;
    unified_receipt: AppleNotificationUnifiedReceipt;
    original_transaction_id?: string;
}

interface AdyenNotification {
    NotificationRequestItem: {
        eventCode: 'AUTHORISATION' | 'CHARGEBACK' | 'REFUND';
        merchantReference: string;
        pspReference: string;
        paymentMethod: string;
        reason: string;
        success: string;
    };
}

export class PaymentNotificationsRoute extends PaymentsRoute {
    static create(router: SitlyRouter) {
        router.post('/payments', (req, res, next) => {
            if (req.body.notificationItems) {
                LogService.logRequest({ req, label: 'payment.adyen.postback', user: undefined });
                return new PaymentNotificationsRoute().processNotification(req, res, next);
            } else if (req.body.notification_type && req.body.environment) {
                LogService.logRequest({ req, label: 'payment.apple.postback', user: undefined });
                return new PaymentNotificationsRoute().processItunesNotification(req, res, next);
            } else if (req.body.message && req.body.subscription) {
                const notificationDataEncoded = req.body.message.data as string;
                const notificationData = notificationDataEncoded ? Buffer.from(notificationDataEncoded, 'base64').toString() : undefined;
                LogService.logRequest({ req, label: 'payment.google.postback', message: notificationData, user: undefined });
                return new PaymentNotificationsRoute().processGoogleNotification(req, res, next);
            } else {
                LogService.logRequest({ req, label: 'payment.postback.invalidBody', user: undefined });
                res.status(422);
                res.json(
                    JSONAPIError({
                        code: 'INVALID_VALUE',
                        title: 'Unsupported body content',
                    }),
                );
                return null;
            }
        });
    }

    private async processNotification(req: Request, res: Response, next: NextFunction) {
        const authUser = auth(req);
        const isAllowed =
            authUser?.name === Environment.apiKeys.adyen.notifications.username &&
            authUser?.pass === Environment.apiKeys.adyen.notifications.password;

        if (isAllowed) {
            const notifications = (req.body.notificationItems as AdyenNotification[]) ?? [];
            try {
                for (const notification of notifications) {
                    const requestItem = notification.NotificationRequestItem;
                    const referenceParts = requestItem.merchantReference.split('_');
                    if (
                        (referenceParts[2] === 'TEST' && !Environment.isTest) ||
                        (referenceParts[2] === 'API-TEST' && !Environment.isApiTests)
                    ) {
                        continue;
                    }

                    const brandCode = referenceParts[0].toLowerCase() as BrandCode;
                    if (!brandCode) {
                        continue;
                    }

                    const paymentId = parseInt(referenceParts[1], 10);
                    if (Number.isNaN(paymentId)) {
                        continue;
                    }
                    const payment = await getModels(brandCode).Payment.byId(paymentId);
                    if (!payment) {
                        throw new Error('Payment not found');
                    }

                    if (Util.isTruthy(requestItem.success)) {
                        if (requestItem.eventCode === 'AUTHORISATION') {
                            try {
                                await this.handleSuccessfulPayment(payment, {
                                    psp_reference: requestItem.pspReference,
                                    payment_method: requestItem.paymentMethod as PaymentMethodType,
                                });
                            } catch (error) {
                                capturePaymentError(req, error as Error);
                            }
                        } else if (requestItem.eventCode === 'CHARGEBACK' || requestItem.eventCode === 'REFUND') {
                            await this.handleChargeback(
                                brandCode,
                                payment,
                                requestItem.eventCode.toLowerCase() as never,
                                requestItem.reason,
                            );
                        }
                    } else {
                        await payment.update({
                            order_type: [PaymentType.setup, PaymentType.setupProcessing].includes(payment.order_type)
                                ? PaymentType.initial
                                : payment.order_type,
                            psp_reference: requestItem.pspReference,
                            payment_method: requestItem.paymentMethod as PaymentMethodType,
                            refusal_reason: requestItem.reason,
                            paid: 0,
                        });

                        if (requestItem.eventCode === 'AUTHORISATION') {
                            const models = getModels(brandCode);
                            const user = await models.User.byId(payment.webuser_id);
                            if (user) {
                                let newPremiumEnd = null;

                                const lastPaidPayment = await user.customUser.lastPaidPayment();
                                if (lastPaidPayment?.subscription_id) {
                                    const subscription = await models.Subscription.findByPk(lastPaidPayment.subscription_id);
                                    if (subscription) {
                                        newPremiumEnd = add(lastPaidPayment.created, {
                                            [subscription.duration_unit]: subscription.duration,
                                        });
                                    }
                                }
                                const previousPremium = user.customUser.premium;
                                await user.customUser.update({
                                    premium: newPremiumEnd,
                                });
                                await optionalAwait(TrackingService.trackUserPremiumStatusChange(user, previousPremium));
                            }
                        }
                    }
                }
            } catch (error) {
                capturePaymentError(req, error as Error);
            }
            res.status(202);
            res.json('[accepted]');
        } else {
            unauthorized({ res });
        }
    }

    private async processItunesNotification(req: Request, res: Response, next: NextFunction) {
        const completeUnsuccessful = () => {
            return res.status(202).json();
        };
        const body = req.body as AppleNotificationBody;

        const successfullNotificationTypes = [
            AppleNotificationType.renewal,
            AppleNotificationType.interactiveRenewal,
            AppleNotificationType.didChangeRenewalStatus,
            AppleNotificationType.didRenew,
        ];
        if (successfullNotificationTypes.includes(body.notification_type)) {
            const lastReceiptInfo = AppleReceiptService.parseReceipt(body.unified_receipt);
            const lastTransaction = lastReceiptInfo?.lastTransaction;
            const originalTransactionId = lastTransaction?.original_transaction_id;
            const expiryDate = lastReceiptInfo?.expiryDate?.toDate();
            if (originalTransactionId && expiryDate) {
                if (PaymentsRoute.blockedUsersITunesTransactionIds.includes(originalTransactionId)) {
                    return completeUnsuccessful();
                }

                const originalPayment = await this.applePaymentByTransactionId(originalTransactionId);
                if (originalPayment) {
                    const brandCode = originalPayment.brandCode;
                    const models = getModels(brandCode);
                    const latestTransactionId = lastTransaction.transaction_id;
                    let payment = await models.Payment.byPspReference(latestTransactionId);
                    if (!payment) {
                        payment = models.Payment.build();
                        payment.created = new Date();
                    }
                    payment.set({
                        order_type: latestTransactionId === originalTransactionId ? PaymentType.initial : PaymentType.recurring,
                        webuser_id: originalPayment.webuser_id,
                        amount: originalPayment.amount,
                        psp: PSP.apple,
                        paid: 1,
                        psp_reference: latestTransactionId,
                    });
                    try {
                        await payment.save();
                    } catch (error) {
                        LogService.logRequest({
                            req,
                            label: 'payment.apple.postback.error.savePayment',
                            details: error as Record<string, unknown>,
                            user: undefined,
                        });
                        return this.serverError(req, res, error as Error);
                    }

                    const user = await models.User.byId(originalPayment.webuser_id);
                    if (user) {
                        const previousPremium = user.customUser.premium;
                        await user.customUser.update({
                            subscription_id: null,
                            subscription_cancelled: 0,
                            premium: expiryDate,
                        });
                        await optionalAwait(TrackingService.trackUserPremiumStatusChange(user, previousPremium));
                        return res.status(204).json();
                    }
                }
            }
        } else if (body.notification_type === AppleNotificationType.cancel) {
            const originalPayment = await this.applePaymentByTransactionId(body.original_transaction_id);
            if (originalPayment) {
                const user = await getModels(originalPayment.brandCode).User.byId(originalPayment.webuser_id);
                if (user) {
                    await Promise.all([this.createChargebackPayment(originalPayment, undefined), user?.removePremium()]);
                    return res.status(204).json();
                }
            }
        }

        LogService.logRequest({ req, label: 'payment.apple.postback.error', user: undefined });
        return completeUnsuccessful();
    }

    private async processGoogleNotification(req: Request, res: Response, next: NextFunction) {
        const notification = req.body as {
            message: {
                data: string;
            };
            subscription: unknown;
        };

        /*
            (1) SUBSCRIPTION_RECOVERED
                A subscription was recovered from account hold.
            (2) SUBSCRIPTION_RENEWED
                An active subscription was renewed.
            (3) SUBSCRIPTION_CANCELED
                A subscription was either voluntarily or involuntarily cancelled. For voluntary cancellation, sent when the user cancels.
            (4) SUBSCRIPTION_PURCHASED
                A new subscription was purchased.
            (5) SUBSCRIPTION_ON_HOLD
                A subscription has entered account hold (if enabled).
            (6) SUBSCRIPTION_IN_GRACE_PERIOD
                A subscription has entered grace period (if enabled).
            (7) SUBSCRIPTION_RESTARTED
                User has reactivated their subscription from Play > Account > Subscriptions (requires opt-in for subscription restoration).
            (8) SUBSCRIPTION_PRICE_CHANGE_CONFIRMED
                A subscription price change has successfully been confirmed by the user.
            (9) SUBSCRIPTION_DEFERRED
                A subscription's recurrence time has been extended.
            (10) SUBSCRIPTION_PAUSED
                A subscription has been paused.
            (11) SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED
                A subscription pause schedule has been changed.
            (12) SUBSCRIPTION_REVOKED
                A subscription has been revoked from the user before the expiration time.
            (13) SUBSCRIPTION_EXPIRED
                A subscription has expired.
        */

        if (notification.message && notification.subscription) {
            const notificationData = JSON.parse(Buffer.from(notification.message.data, 'base64').toString()) as {
                packageName: string;
                subscriptionNotification?: {
                    notificationType: unknown;
                    subscriptionId: string;
                    purchaseToken: string;
                    productId: unknown;
                };
            };

            if (notificationData.subscriptionNotification) {
                const notificationType = notificationData.subscriptionNotification.notificationType;
                const purchaseToken = notificationData.subscriptionNotification.purchaseToken;
                const subscriptionId = notificationData.subscriptionNotification.subscriptionId;

                const verifier = new googleVerifier({
                    email: Environment.apiKeys.googleapis.client_email,
                    key: Environment.apiKeys.googleapis.private_key,
                });
                if (notificationType === 4 || notificationType === 2 || notificationType === 1) {
                    let verificationResult: GoogleVerificationResult;
                    if (!Environment.isProd && req.body.verificationResult) {
                        verificationResult = req.body.verificationResult as GoogleVerificationResult;
                    } else {
                        try {
                            verificationResult = (await verifier.verifySub({
                                packageName: notificationData.packageName,
                                purchaseToken,
                                productId: subscriptionId,
                            })) as GoogleVerificationResult;
                        } catch {
                            verificationResult = {
                                isSuccessful: false,
                            };
                        }
                    }

                    const isSuccessful = verificationResult.isSuccessful;

                    if (isSuccessful && verificationResult.payload) {
                        const expiryDateString = verificationResult.payload.expiryTimeMillis;
                        const fullOrderId = verificationResult.payload.orderId;

                        if (expiryDateString) {
                            const partialOrderId = fullOrderId.split('.').slice(0, 2).join('.');
                            const originalOrder = await getMainModels().UserGoogleOrder.byPartialPspReference(partialOrderId);
                            const brandCode = originalOrder?.country_code;
                            if (originalOrder && brandCode) {
                                const models = getModels(brandCode);
                                const originalPayment = await models.Payment.byPartialPspReference(partialOrderId);

                                if (originalPayment) {
                                    // eslint-disable-next-line max-depth
                                    try {
                                        await models.Payment.create({
                                            created: new Date(),
                                            order_type: PaymentType.recurring,
                                            webuser_id: originalOrder.webuser_id,
                                            amount: verificationResult.payload.priceAmountMicros / 100_0000,
                                            psp: PSP.google,
                                            paid: 1,
                                            psp_reference: verificationResult.payload.orderId,
                                        });
                                    } catch (error) {
                                        return this.serverError(req, res, error as Error);
                                    }

                                    const expiryDate = moment(expiryDateString, 'x').toDate();
                                    // eslint-disable-next-line max-depth
                                    if (expiryDate) {
                                        const user = await models.User.byId(originalOrder.webuser_id);
                                        // eslint-disable-next-line max-depth
                                        if (user) {
                                            const previousPremium = user.customUser.premium;
                                            user.customUser.subscription_id = null;
                                            user.customUser.subscription_cancelled = 0;
                                            user.customUser.premium = expiryDate;
                                            await user.customUser.save();
                                            await optionalAwait(TrackingService.trackUserPremiumStatusChange(user, previousPremium));

                                            writeFile(`data/google/${Date.now()}.handled`, JSON.stringify(req.body), () => {});

                                            res.status(204);
                                            res.json();
                                            return;
                                        }
                                    }
                                }
                            }
                        }

                        writeFile(`data/google/${Date.now()}.failed-${notificationType}`, JSON.stringify(req.body), () => {});
                        res.status(202);
                        res.json();
                        return void 0;
                    }
                }

                if (notificationType === 12 || notificationType === 3 || notificationType === 5) {
                    let verificationResult: GoogleVerificationResult;
                    if (!Environment.isProd && req.body.verificationResult) {
                        verificationResult = req.body.verificationResult as GoogleVerificationResult;
                    } else {
                        try {
                            verificationResult = (await verifier.verifySub({
                                packageName: notificationData.packageName,
                                purchaseToken,
                                productId: subscriptionId,
                            })) as GoogleVerificationResult;
                        } catch {
                            verificationResult = {
                                isSuccessful: false,
                            };
                        }
                    }
                    const isSuccessful = verificationResult.isSuccessful;
                    if (isSuccessful && verificationResult.payload) {
                        const fullOrderId = verificationResult.payload.orderId;

                        const partialOrderId = fullOrderId.split('.').slice(0, 2).join('.');
                        const originalOrder = await getMainModels().UserGoogleOrder.byPartialPspReference(partialOrderId);
                        const brandCode = originalOrder?.country_code;
                        if (brandCode) {
                            const models = getModels(brandCode);
                            const originalPayment = await models.Payment.byPartialPspReference(partialOrderId);
                            if (originalPayment) {
                                const user = await models.User.byId(originalPayment.webuser_id);
                                if (user) {
                                    user.customUser.subscription_cancelled = 1;
                                    // eslint-disable-next-line max-depth
                                    if (notificationType === 12) {
                                        await this.createChargebackPayment(originalPayment, verificationResult.payload.orderId);
                                        user.customUser.premium = null;
                                        user.customUser.subscription_cancellation_date = new Date();
                                    }
                                    await user.customUser.save();
                                    await optionalAwait(TrackingService.trackUserPremiumStatusChange(user, null, true));
                                    return res.status(204).json();
                                }
                            }
                        }
                    }
                    res.status(202);
                    res.json();
                    return void 0;
                }
            }
        }
        res.status(202);
        res.json();
    }

    // ---- Internal ---- //
    private async applePaymentByTransactionId(transactionId: string | undefined) {
        if (transactionId) {
            const originalOrder = await getMainModels().UserAppleOrder.byTransactionId(transactionId);
            const brandCode = originalOrder?.country_code;
            if (brandCode) {
                return getModels(brandCode).Payment.byPspReference(transactionId);
            }
        }
        return null;
    }

    private async createChargebackPayment(originalPayment: Payment, pspReference: string | undefined) {
        return originalPayment.sequelize.models.Payment.create({
            created: new Date(),
            order_type: PaymentType.chargeback,
            webuser_id: originalPayment.webuser_id,
            amount: originalPayment.amount * -1,
            psp: originalPayment.psp,
            paid: 1,
            psp_reference: pspReference,
        });
    }

    private async handleChargeback(
        brandCode: BrandCode,
        payment: Payment,
        chargebackType: PaymentType.chargeback | PaymentType.refund,
        reason: string,
    ) {
        const chargebackTime = new Date();
        // Add information about chargeback to original order
        payment.update({
            chargeback_time: chargebackTime,
            chargeback_remarks: reason,
            refunded: 1,
        });

        const models = getModels(brandCode);
        await models.Payment.create({
            active: 1,
            webuser_id: payment.webuser_id,
            amount: payment.amount * -1,
            subscription_id: payment.subscription_id,
            paid: 1,
            order_type: chargebackType,
            chargeback_order: `${brandCode.toUpperCase()}_${payment.instance_id}`,
            chargeback_time: chargebackTime,
            chargeback_remarks: reason,
            created: chargebackTime,
        });

        const user = await models.User.byId(payment.webuser_id);
        if (user) {
            if (reason.includes('InsufficientFunds')) {
                const insufficientFundsChargeBacks = await models.Payment.getInsufficientFundChargeBacks(user.webuser_id);
                const newPremiumMoment = moment(user.customUser?.premium).subtract(15, 'days');

                if (insufficientFundsChargeBacks.length >= 4) {
                    await user.removePremium();
                } else if (user.customUser?.premium && moment(user.customUser?.premium).isAfter(newPremiumMoment)) {
                    await user.customUser.update({ premium: newPremiumMoment.toDate() });
                }
            } else {
                await user.removePremium();
            }
        }
    }
}
