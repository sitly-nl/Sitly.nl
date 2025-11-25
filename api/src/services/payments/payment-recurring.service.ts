import { TrackingService } from '../tracking.service';
import { LogService } from '../log.service';
import { config } from '../../../config/config';
import { BrandCode } from '../../models/brand-code';
import { PSP } from '../../models/payment.model';
import { PaymentType } from '../../models/payment-types';
import { AdyenService, PaymentPayload } from './adyen.service';
import { PaymentsRoute } from '../../routes/payments/payments';
import { SlackChannels, SlackNotifications } from '../slack-notifications.service';
import { Environment } from '../env-settings.service';
import { getModels } from '../../sequelize-connections';
import { Subscription } from '../../models/subscription.model';
import { User } from '../../models/user/user.model';
import { add, sub } from 'date-fns';
import { Op, Sequelize } from 'sequelize';

export class RecurringPaymentService {
    private static gracePeriodReasons = ['not enough balance', 'withdrawal count exceeded', 'withdrawal amount exceeded'];

    static async recurPayments(brandCode: BrandCode, daysAgo: number | undefined) {
        const users = await getModels(brandCode).User.findAll({
            where: { active: 1 },
            include: {
                association: 'customUser',
                where: {
                    subscription_cancelled: 0,
                    deleted: 0,
                    premium: {
                        [Op.eq]: Sequelize.literal(`CURDATE() - INTERVAL ${(daysAgo ?? 0) + 1} DAY`),
                    },
                },
                include: [{ association: 'subscription', required: true }],
            },
        });
        await RecurringPaymentService.recurUsers(brandCode, users, daysAgo);
    }

    static async retryFailedRecurringPayments(brandCode: BrandCode) {
        const models = getModels(brandCode);

        const refusalReasonsToRetry = ['Issuer unavailable'];
        const payments = await models.Payment.failedRecurringPayments(refusalReasonsToRetry);
        for (const payment of payments) {
            try {
                const user = await models.User.byId(payment.webuser_id);
                if (user && payment.subscription) {
                    await RecurringPaymentService.recur(user, payment.subscription);
                }
            } catch (error) {
                console.log(error);
            }
        }
    }

    static async retryRecurringPayments(brandCode: BrandCode) {
        const periods = [10, 20, 30];
        for (const period of periods) {
            const users = await getModels(brandCode).User.findAll({
                where: {
                    active: 1,
                },
                include: [
                    {
                        association: 'customUser',
                        where: {
                            deleted: 0,
                            subscription_cancelled: 0,
                            subscription_id: { [Op.ne]: null },
                            premium: {
                                [Op.eq]: Sequelize.fn('DATE_SUB', Sequelize.fn('CURDATE'), Sequelize.literal(`INTERVAL ${period} DAY`)),
                            },
                        },
                        include: [
                            { association: 'subscription', required: true },
                            {
                                association: 'allPayments',
                                where: [
                                    { refusal_reason: RecurringPaymentService.gracePeriodReasons },
                                    Sequelize.literal(
                                        `DATE_FORMAT(FROM_UNIXTIME(\`customUser->allPayments\`.\`created\`), '%Y-%m-%d') = DATE_FORMAT(DATE_SUB(NOW(), INTERVAL ${
                                            period - 1
                                        } DAY), '%Y-%m-%d')`,
                                    ),
                                ],
                            },
                        ],
                    },
                ],
            });
            await RecurringPaymentService.recurUsers(brandCode, users);
        }
    }

    static async recurUsers(brandCode: BrandCode, users: User[], daysAgo?: number) {
        for (const user of users) {
            try {
                const subscription = user.customUser.subscription;
                if (!subscription) {
                    throw new Error(`Subscription not found: ${JSON.stringify(user)}`);
                }
                await RecurringPaymentService.recur(user, subscription, daysAgo);
            } catch (error) {
                if (Environment.isProd) {
                    await SlackNotifications.send(
                        `*Error during recur <@U72HR28B0> <@U0JEG5B7U>:*\n brandCode=${brandCode}, userId=${user.webuser_id}\n${
                            error as never
                        }`,
                        SlackChannels.paymentMonitoring,
                    );
                }
            }
        }
    }

    static async recur(user: User, subscription: Subscription, daysToDeduct?: number) {
        const brandCode = user.brandCode;
        const amount = PaymentsRoute.amount(subscription, user);
        const payment = await getModels(brandCode).Payment.create({
            webuser_id: user.webuser_id,
            subscription_id: subscription.instance_id,
            order_type: PaymentType.recurring,
            psp: PSP.adyen,
            amount: amount.amount,
            discount_percentage: amount.percentage,
            created: sub(new Date(), { days: daysToDeduct ?? 0 }),
        });

        const adyenStatus = await AdyenService.makeRecurringPayment(
            new PaymentPayload(payment, user, config.getConfig(brandCode), { paymentMethodType: 'recurring' }),
        );

        payment.set({
            psp_reference: adyenStatus.pspReference,
            payment_method: adyenStatus.paymentMethod ?? (adyenStatus.additionalData?.paymentMethod as never),
        });

        const resultCode = adyenStatus.resultCode?.toLowerCase();
        const successful = resultCode === 'authorised' || resultCode === 'received';
        if (!successful && resultCode !== 'refused') {
            LogService.log({ brandCode, label: 'cron.recurringPayment.failure', user, details: adyenStatus as never });
        }

        if (successful) {
            payment.paid = 1;

            const duration =
                payment.order_type === PaymentType.recurring && subscription.recur_per_initial_period ? subscription.duration : 1;
            await user.customUser.update({
                premium: sub(add(new Date(), { [subscription.duration_unit]: duration }), { days: 1 + (daysToDeduct ?? 0) }),
                subscription_cancelled: 0,
            });
        } else if (resultCode === 'refused') {
            const refusalReason = adyenStatus.refusalReason;
            payment.refusal_reason = refusalReason ?? null;

            const additionalDataField = 'refusalReasonRaw';
            if (adyenStatus.additionalData?.[additionalDataField]) {
                payment.extra_info = JSON.stringify({ additionalDataField: adyenStatus.additionalData[additionalDataField] });
            }

            if (RecurringPaymentService.gracePeriodReasons.includes(refusalReason ?? '')) {
                await user.customUser.update({ grace_period: add(new Date(), { days: 9 }) });
            }
        }

        await Promise.all([
            payment.save(),
            ...(daysToDeduct ? [] : [TrackingService.trackPayment(user, subscription, payment.instance_id)]),
        ]);

        return payment;
    }
}
