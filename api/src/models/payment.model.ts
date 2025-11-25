import { Column, DataType, ForeignKey, Table, BelongsTo } from 'sequelize-typescript';
import { ColumnTimestamp, CountryBaseModel } from './base.model';
import { PaymentType } from './payment-types';
import { Subscription } from './subscription.model';
import { CustomUser } from './user/custom-user.model';
import { getUnixTime, sub } from 'date-fns';
import { Op, Sequelize } from 'sequelize';
import { Coupon } from './coupon.model';

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

export enum PSP {
    adyen = 'adyen',
    apple = 'apple',
    google = 'google',
}

export enum PaymentPlatform {
    web = 'web',
    android = 'android',
    ios = 'ios',
}

export class PaymentColumns extends CountryBaseModel<
    PaymentColumns,
    'instance_id',
    'order_type' | 'active' | 'paid' | 'discount_percentage' | 'user_notified' | 'reactivation'
> {
    @Column({ primaryKey: true, autoIncrement: true }) instance_id: number;

    @Column({ allowNull: false })
    @ForeignKey(() => CustomUser)
    webuser_id: number;

    @Column(DataType.INTEGER)
    @ForeignKey(() => Subscription)
    subscription_id: number | null;

    @Column(DataType.INTEGER)
    @ForeignKey(() => Coupon)
    coupon_id: number | null;

    @Column({
        allowNull: false,
        type: DataType.ENUM(...Object.values(PaymentType)),
        defaultValue: PaymentType.initial,
    })
    order_type: PaymentType;
    @Column(DataType.STRING) psp: PSP | null;
    @Column(DataType.STRING) psp_reference: string | null;
    @Column(DataType.STRING) payment_method: PaymentMethodType | null;
    @Column({ type: DataType.ENUM(...Object.values(PaymentPlatform)) }) platform: PaymentPlatform | null;
    @ColumnTimestamp created: Date;
    @Column(DataType.DATE) chargeback_time: Date | null;
    @Column({ allowNull: false }) amount: number;
    @Column({ allowNull: false, defaultValue: 1 }) active: 0 | 1;
    @Column({ defaultValue: 0 }) paid: 0 | 1;
    @Column(DataType.INTEGER) refunded: 0 | 1 | null;
    @Column(DataType.STRING) refusal_reason: string | null;
    @Column(DataType.STRING) chargeback_order: string | null;
    @Column(DataType.STRING) chargeback_remarks: string | null;
    @Column({ defaultValue: 0 }) discount_percentage: number;
    @Column(DataType.STRING) extra_info: string | null;
    @Column({ allowNull: false, defaultValue: 0 }) user_notified: 0 | 1;
    @Column({ allowNull: false, defaultValue: 0 }) reactivation: 0 | 1;
}

@Table({ tableName: 'custom_module_orders' })
export class Payment extends PaymentColumns {
    @BelongsTo(() => Subscription) subscription: Subscription;
    @BelongsTo(() => CustomUser) customUser: CustomUser;
    @BelongsTo(() => Coupon) coupon: Coupon;

    static readonly paidWhere = [
        { active: 1 },
        { paid: 1 },
        { amount: { [Op.gt]: 0 } },
        Sequelize.where(Sequelize.fn('COALESCE', Sequelize.col('refunded'), 0), Op.ne, 1),
    ];

    static byId(orderId: number) {
        if (Number.isNaN(orderId)) {
            return null;
        }
        return this.findOne({
            where: { instance_id: orderId },
        });
    }

    static byPspReference(pspReference: string) {
        return this.findOne({
            where: { psp_reference: pspReference },
        });
    }

    static byPartialPspReference(partialPspReference: string) {
        return this.findOne({
            where: { psp_reference: { [Op.startsWith]: partialPspReference } },
        });
    }

    static byChargebackOrder(chargebackOrderId: string) {
        return this.findOne({
            where: { chargeback_order: chargebackOrderId },
        });
    }

    static getInsufficientFundChargeBacks(userId: number) {
        return this.findAll({
            where: {
                webuser_id: userId,
                order_type: PaymentType.chargeback,
                chargeback_remarks: {
                    [Op.substring]: 'InsufficientFunds',
                },
            },
        });
    }

    static failedRecurringPayments(refusalReasonsToRetry: string[]) {
        return this.findAll({
            where: {
                order_type: PaymentType.recurring,
                paid: 0,
                created: {
                    [Op.gt]: Sequelize.literal('UNIX_TIMESTAMP(CURDATE() - INTERVAL 20 HOUR)'),
                },
                [Op.and]: Sequelize.where(Sequelize.fn('CONCAT', Sequelize.col('extra_info'), Sequelize.col('refusal_reason')), {
                    [Op.regexp]: refusalReasonsToRetry.join('|'),
                }),
            },
            include: 'subscription',
        });
    }

    static deleteOutdatedSetupPayments() {
        return this.destroy({
            where: {
                order_type: PaymentType.setup,
                created: { [Op.lt]: getUnixTime(sub(new Date(), { weeks: 1 })) },
            },
        });
    }
}
