import { TrackingService } from './../../services/tracking.service';
import { LogService } from '../../services/log.service';
import { SitlyRouter } from '../sitly-router';
import { NextFunction, Request, Response } from 'express';
import { BaseRoute } from '../route';
import { Payment, PaymentColumns, PaymentMethodType, PaymentPlatform, PSP } from '../../models/payment.model';
import * as moment from 'moment';
import { AdyenService, PaymentPayload } from '../../services/payments/adyen.service';
import { config } from '../../../config/config';
import { ChildProcessService } from '../../services/child-process.service';
import { PaymentType } from '../../models/payment-types';
import { serializeUser } from '../users/user.serializer';
import { UserWarningService } from '../../services/user-warning.service';
import { optionalAwait, Util } from '../../utils/util';
import { forbiddenError, notFoundError, unprocessableEntityError } from '../../services/errors';
import { UrlUtil } from '../../utils/url-util';
import { CommonEmailsService } from '../../services/email/common-emails.service';
import { add, sub, isBefore } from 'date-fns';
import { RecurringPaymentService } from '../../services/payments/payment-recurring.service';
import { getModels } from '../../sequelize-connections';
import { UserRequest } from '../../services/auth.service';
import { Op, Sequelize } from 'sequelize';
import { Subscription } from '../../models/subscription.model';
import { User } from '../../models/user/user.model';
import { serialize } from '../../models/serialize/payment-response';
import { FacebookService } from '../../services/facebook.service';

export class PaymentsRoute extends BaseRoute {
    static blockedUsersITunesTransactionIds = ['370000316956299'];

    static create(router: SitlyRouter) {
        router.post<UserRequest>('/payments/sessions', (req, res, next) => {
            return new PaymentsRoute().sessions(req, res);
        });

        router.get<UserRequest>('/users/me/payments', (req, res) => {
            LogService.logRequest({ req, label: 'payment.get.allPayments' });
            return new PaymentsRoute().index(req, res);
        });

        router.get('/users/me/payments/:paymentId', (req, res, next) => {
            if (req.query.redirectResult) {
                LogService.logRequest({ req, label: 'payment.get.externalPayment.validation', user: undefined });
                return new PaymentsRoute().validateExternalPayment(req, res, next);
            }
            return null;
        });

        router.post<UserRequest>('/users/me/validate-voucher', (req, res, next) => {
            return new PaymentsRoute().validateVoucher(req, res, next);
        });

        router.get<UserRequest>('/users/me/payments/:paymentId/invoice', (req, res, next) => {
            new PaymentsRoute().paymentInvoice(req, res, next);
            return null;
        });

        router.post<UserRequest>('/users/me/payments/free-extension', (req, res) => {
            return new PaymentsRoute().freeExtension(req, res);
        });

        router.post<UserRequest>('/users/me/payments/resume', (req, res, next) => {
            return new PaymentsRoute().resume(req, res);
        });

        router.patch<UserRequest>('/users/me/payments/:paymentId', (req, res, next) => {
            return new PaymentsRoute().updatePayment(req, res, next);
        });
    }

    static amount(subscription: Subscription, user: User, couponDiscountPercentage?: number) {
        let amount = subscription.amount;
        let percentage = couponDiscountPercentage ?? user.customUser.discount_percentage ?? 0;
        if (percentage === 0 && user.created && isBefore(sub(new Date(), { days: 1 }), user.created)) {
            percentage = subscription.discount_percentage ?? 0;
        }
        if (percentage > 0) {
            amount = parseFloat((amount * ((100 - percentage) / 100)).toFixed(2));
        }
        return { amount, percentage };
    }

    protected async createPayment(req: UserRequest, res: Response, additionalProperties: Partial<PaymentColumns> = {}) {
        const models = getModels(req.brandCode);
        const subscriptionId = req.body.subscriptionId as number;
        const subscription = await models.Subscription.byId(subscriptionId);
        if (!subscription) {
            return unprocessableEntityError({
                res,
                code: 'NOT_FOUND',
                title: 'Subscription not found',
                source: { parameter: 'subscriptionId' },
            });
        }

        if (subscription.webrole_id !== req.user.webrole_id) {
            return unprocessableEntityError({
                res,
                title: 'This subscription is intended to be used by the user with another role',
                source: { parameter: 'subscriptionId' },
            });
        }

        let coupon;
        if (req.user.customUser.active_coupon_code) {
            coupon = await models.Coupon.findOne({
                where: {
                    active: 1,
                    coupon_code: req.user.customUser.active_coupon_code ?? undefined,
                    start_date: { [Op.lte]: new Date() },
                    [Op.or]: [
                        { end_date: null },
                        // (1) day grace period is possible only for the payments
                        { end_date: { [Op.gte]: sub(new Date(), { days: 1 }) } },
                    ],
                    subscription_id: subscription.instance_id,
                },
            });
        }

        const amount = PaymentsRoute.amount(subscription, req.user, coupon?.discount_percentage);
        const payment = await models.Payment.create({
            order_type: PaymentType.initial,
            webuser_id: req.user.webuser_id,
            subscription_id: subscriptionId,
            amount: amount.amount,
            discount_percentage: amount.percentage,
            psp: PSP.adyen,
            paid: 0,
            platform: Util.isAndroidApp(req.headers) ? PaymentPlatform.android : PaymentPlatform.web,
            created: new Date(),
            payment_method: (req.body.paymentMethod as PaymentMethodType) ?? null,
            coupon_id: coupon?.coupon_id ?? null,
            ...additionalProperties,
        });
        this.trackFacebookPremiumPurchase(req, req.user, payment);
        return payment;
    }

    protected trackFacebookPremiumPurchase(req: Request, user: User, payment: Payment) {
        new FacebookService().trackPremiumPurchase(req, user, payment);
    }

    private async sessions(req: UserRequest, res: Response) {
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
        if (await this.handleValidationResult(req, res)) {
            return;
        }

        if (req.user.isPremium) {
            return forbiddenError({ res, title: 'Session creation is not allowed for premium users' });
        }

        try {
            const payment = await this.createPayment(req, res, { order_type: PaymentType.setup });
            if (!payment) {
                if (res.statusCode === 200) {
                    return this.serverError(req, res, new Error('createAdyenSession.noPayment'));
                }
                return;
            }

            const returnUrl = UrlUtil.apiUrl(
                req,
                `/users/me/payments/${payment.instance_id}${
                    req.body.returnUrl ? `?returnUrl=${encodeURIComponent(req.body.returnUrl as string)}` : ''
                }`,
            );
            res.json(
                await AdyenService.sessions(
                    new PaymentPayload(payment, req.user, config.getConfig(req.brandCode), { paymentMethodType: 'session', returnUrl }),
                ),
            );
        } catch (err) {
            LogService.logRequest({ req, label: 'payment.adyen.session.error.server', message: '' });
            return this.serverError(req, res, err as Error);
        }
    }

    async index(req: UserRequest, res: Response) {
        const payments = await req.user.sequelize.models.Payment.findAll({
            where: {
                webuser_id: req.user.webuser_id,
                active: 1,
                paid: 1,
                amount: { [Op.ne]: 0 },
            },
        });
        res.json(serialize(payments));
    }

    protected async handleSuccessfulPayment(payment: Payment, paymentProperties: Partial<PaymentColumns> = {}) {
        const shouldHandle =
            payment.paid === 0 && [PaymentType.initial, PaymentType.setup, PaymentType.setupProcessing].includes(payment.order_type);
        if (!shouldHandle) {
            return;
        }

        const user = await payment.sequelize.models.User.byId(payment.webuser_id);
        const paidPaymentsCount = await user?.customUser.paidPaymentsCount();

        await payment.update({
            order_type: PaymentType.initial,
            reactivation: (paidPaymentsCount ?? 0) > 0 ? 1 : 0,
            paid: 1,
            ...paymentProperties,
        });

        if (user) {
            const subscription = await payment.sequelize.models.Subscription.byId(payment.subscription_id);
            if (subscription) {
                const premiumExpiryDate = moment().add(subscription.duration, subscription.duration_unit);
                await optionalAwait(UserWarningService.processPayment(user, payment));
                const previousPremium = user.customUser.premium;
                await user.customUser.update({
                    subscription_id: subscription.instance_id,
                    subscription_cancelled: 0,
                    premium: premiumExpiryDate,
                });

                CommonEmailsService.sendPaymentInvoice(payment.instance_id, user);
                await optionalAwait(TrackingService.trackUserPremiumStatusChange(user, previousPremium));
                await TrackingService.trackPayment(user, subscription, payment.instance_id);
            }
        }
    }

    private async validateExternalPayment(req: Request, res: Response, next: NextFunction) {
        const paymentId = req.params.paymentId;
        const redirectResult = req.query.redirectResult as string;

        if (paymentId && redirectResult) {
            const validation = await AdyenService.paymentDetails(redirectResult);
            if (validation.merchantReference?.split('_')?.[1] === paymentId) {
                const payment = await getModels(req.brandCode).Payment.byId(parseInt(paymentId, 10));

                if (payment) {
                    const status = validation.resultCode.toLowerCase() === 'authorised' ? 'PAID' : 'UNPAID';
                    if (status === 'PAID') {
                        await this.handleSuccessfulPayment(payment, { psp_reference: validation.pspReference ?? '' });
                    } else {
                        await payment.update({
                            refusal_reason: validation.resultCode,
                        });
                    }

                    if (req.query.returnUrl) {
                        res.redirect(`${req.query.returnUrl as string}?status=${status}`);
                    } else {
                        // returns 202 even when authResult is not PAID.
                        res.status(202).json(serialize(payment));
                    }
                } else {
                    notFoundError({ res, title: 'Payment not found' });
                }
            } else {
                unprocessableEntityError({ res, title: 'Payment response data was tampered with' });
            }
        } else {
            unprocessableEntityError({ res, title: 'Invalid response data' });
        }
    }

    async validateVoucher(req: UserRequest, res: Response, next: NextFunction) {
        req.checkBody('code').notEmpty().withMessage({
            code: 'REQUIRED',
            title: 'code is required',
        });
        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }

        const models = getModels(req.brandCode);
        const voucher = await models.WelfareVoucher.findOne({ where: { code: req.body.code as string } });
        if (!voucher) {
            return notFoundError({ res, title: 'Voucher not found' });
        }

        if (voucher.used) {
            return forbiddenError({ res, title: 'This code already used' });
        }

        try {
            const payment = await models.Payment.create({
                webuser_id: req.user.webuser_id,
                payment_method: PaymentMethodType.welfareVoucher,
                psp_reference: voucher.code,
                paid: 1,
                amount: voucher.month_price,
                created: new Date(),
            });

            const user = await models.User.byId(req.user.webuser_id);
            if (!user) {
                return notFoundError({ res, title: 'User for voucher not found' });
            }

            const previousPremium = user.customUser.premium;
            await user?.customUser.update({
                premium: add(new Date(), { months: voucher.period }),
            });
            await optionalAwait(TrackingService.trackUserPremiumStatusChange(user, previousPremium));

            await voucher.update({ used: 1 });

            res.status(201).json(serialize(payment));
        } catch (error) {
            this.serverError(req, res, error as Error);
        }
    }

    private paymentInvoice(req: UserRequest, res: Response, next: NextFunction) {
        const input = {
            userId: req.user.webuser_id,
            paymentId: parseInt(req.params.paymentId, 10),
            localeId: req.localeId,
            brandCode: req.brandCode,
        };
        ChildProcessService.getPdf(input, readStream => {
            if (readStream) {
                res.status(200);
                res.setHeader('Content-Type', 'application/pdf');
                readStream.pipe(res);
            } else {
                notFoundError({ res, title: 'Error generating invoice' });
            }
        });
    }

    async freeExtension(req: UserRequest, res: Response) {
        if (!(await req.user.customUser.freePremiumExtensionAvailable())) {
            return forbiddenError({ res, title: 'Free premium is not allowed for you' });
        }
        const previousPremium = req.user.customUser.premium;
        req.user.customUser.update({
            free_premium_extension_used: 1,
            premium: add(previousPremium ?? new Date(), { months: 2 }),
        });
        await optionalAwait(TrackingService.trackUserPremiumStatusChange(req.user, previousPremium));
        let includes;
        try {
            includes = this.getIncludes(req, this.userPrivateAllowedIncludes);
        } catch (e) {
            return this.handleError(req, res, e);
        }
        await req.user.customUser.reload({ include: includes });
        const response = await serializeUser({ data: req.user, contextUser: req.user, localeCode: req.locale, includes });
        res.json(response);
    }

    async resume(req: UserRequest, res: Response) {
        await req.user.customUser.reload({ include: 'subscription' });
        const subscription = req.user.customUser.subscription;
        if (!subscription) {
            return forbiddenError({ res, title: 'User should have subscription to resume' });
        }
        if (req.user.isPremium) {
            await req.user.customUser.update({ subscription_cancelled: 0 });
            await optionalAwait(TrackingService.trackUserPremiumStatusChange(req.user, req.user.customUser.premium));
            return res.status(200).json();
        }
        const payment = await RecurringPaymentService.recur(req.user, subscription);
        await payment.update({ reactivation: 1 });
        res.status(201).json(serialize(payment));
    }

    private async updatePayment(req: UserRequest, res: Response, next: NextFunction) {
        const updatableProperties = ['type'];
        const allowedTypes = [PaymentType.setupProcessing];
        const errors = Object.keys(req.body as object)
            .filter(item => !updatableProperties.includes(item))
            .map(param => {
                return { msg: { code: 'INVALID_FIELD' }, param };
            });
        req.checkBody('type')
            .optional()
            .isIn(allowedTypes)
            .withMessage({
                code: 'INVALID_VALUE',
                title: `type must be one of ${allowedTypes}`,
            });
        if (await this.handleValidationResult(req, res, errors)) {
            return;
        }
        const models = getModels(req.brandCode);
        const payment = await models.Payment.byId(parseInt(req.params.paymentId, 10));
        if (!payment) {
            return notFoundError({ res, title: 'Payment not found' });
        }
        if (payment.webuser_id !== req.user.webuser_id) {
            return forbiddenError({ res, title: 'This is not yours to edit' });
        }
        if (req.body.type === PaymentType.setupProcessing) {
            if (payment.order_type !== PaymentType.setup) {
                return forbiddenError({ res, title: 'Only setup payments can be updated' });
            }
            // To avoid race condition with payment update in notification handling, moved order_type check directly to update transaction
            await models.Payment.update(
                { order_type: Sequelize.literal(`IF(order_type = '${PaymentType.setup}', '${PaymentType.setupProcessing}', order_type)`) },
                { where: { instance_id: payment.instance_id } },
            );
            await payment.reload();
        }
        res.status(201).json(serialize(payment));
    }
}
