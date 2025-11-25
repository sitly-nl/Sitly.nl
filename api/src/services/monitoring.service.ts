import { PSP } from './../models/payment.model';
import { BrandCode } from '../models/brand-code';
import { SlackChannels, SlackNotifications } from './slack-notifications.service';
import { getModels } from '../sequelize-connections';
import { Sequelize } from 'sequelize-typescript';
import { Op } from 'sequelize';
import { CustomUser } from '../models/user/custom-user.model';
import { format, isToday } from 'date-fns';

export class Monitoring {
    filteredRefusalReasons = ['Not enough balance', 'Blocked Card', 'Expired Card'];

    async runCycle(brandCode: BrandCode) {
        const models = getModels(brandCode);
        const users = await models.User.findAll({
            where: {
                active: 1,
            },
            include: {
                association: 'customUser',
                where: {
                    subscription_cancelled: 0,
                    deleted: 0,
                    disabled: 0,
                    premium: {
                        [Op.eq]: Sequelize.literal('CURDATE() - INTERVAL 1 DAY'),
                    },
                },
                include: CustomUser.includes(['allPayments']),
            },
        });

        const results: Record<string, unknown[]> = {};
        users.forEach(user => {
            let key: string | undefined;
            let value;

            const payments = user.customUser.allPayments ?? [];
            if (payments.length === 0) {
                key = 'no_payments';
                value = {
                    order: null,
                    user: user.webuser_id,
                };
            } else {
                const payment = payments.reduce((max, payment) => (payment.instance_id > max.instance_id ? payment : max), payments[0]);

                value = `order: ${payment.instance_id}, user: ${payment.webuser_id}, paid: ${payment.paid}, created: ${format(
                    payment.created,
                    'yyyy-MM-dd',
                )}`;

                switch (payment.psp) {
                    case PSP.apple:
                    case PSP.google:
                        if (isToday(payment.created)) {
                            key = payment.psp;
                        }
                        break;
                    default:
                        if (isToday(payment.created)) {
                            key = payment.refusal_reason ?? '_undefined';
                            if (this.filteredRefusalReasons.includes(key)) {
                                key = undefined;
                            } else if (payment.extra_info) {
                                try {
                                    const extraInfo = JSON.parse(payment.extra_info) as Record<string, string>;
                                    if (extraInfo?.refusalReasonRaw) {
                                        key = `${key} - ${extraInfo.refusalReasonRaw}`;
                                    }
                                } catch {}
                            }
                        } else {
                            key = 'payment_is_missed_for_today';
                        }
                        break;
                }
            }

            if (key) {
                if (results[key]) {
                    results[key].push(value);
                } else {
                    results[key] = [value];
                }
            }
        });

        if (Object.keys(results).length > 0) {
            await this.sendSlackMessage(`*Failed to recur in ${brandCode}:* ${JSON.stringify(results, undefined, 4)}`);
        }

        const bigMarkets = brandCode === BrandCode.netherlands || brandCode === BrandCode.italy || brandCode === BrandCode.spain;

        const applePaymentCount = await models.Payment.count({
            where: {
                psp: PSP.apple,
                created: {
                    [Op.gt]: Sequelize.literal('UNIX_TIMESTAMP(CURRENT_TIMESTAMP() - INTERVAL 1 DAY)'),
                },
            },
        });
        if (applePaymentCount === 0) {
            await this.sendSlackMessage(
                `*No apple payments in ${brandCode}* ${bigMarkets ? '<@U72HR28B0> <@U0JEG5B7U> <@U04C4UKFN>' : ''}`,
            );
        }

        const googlePaymentCount = await models.Payment.count({
            where: {
                psp: PSP.google,
                created: {
                    [Op.gt]: Sequelize.literal('UNIX_TIMESTAMP(CURRENT_TIMESTAMP() - INTERVAL 1 DAY)'),
                },
            },
        });
        if (googlePaymentCount === 0) {
            await this.sendSlackMessage(
                `*No google payments in ${brandCode}* ${bigMarkets ? '<@U72HR28B0> <@U0JEG5B7U> <@U04C4UKFN>' : ''}`,
            );
        }
    }

    private async sendSlackMessage(message: string) {
        return SlackNotifications.send(message, SlackChannels.paymentMonitoring, true);
    }
}
