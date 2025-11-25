import { Column, DataType, ForeignKey, HasMany, HasOne, Table } from 'sequelize-typescript';
import { Util } from '../utils/util';
import { CountryBaseModel } from './base.model';
import { WebRoleId } from './user/user.model';
import { Coupon } from './coupon.model';

export class SubscriptionColumns extends CountryBaseModel<
    SubscriptionColumns,
    'instance_id',
    'active' | 'duration_unit' | 'show_in_overview' | 'recur_per_initial_period'
> {
    @Column({ primaryKey: true, autoIncrement: true }) instance_id: number;

    @Column(DataType.INTEGER)
    @ForeignKey(() => Subscription)
    original_subscription_id: number | null;

    @Column({ defaultValue: 1 }) active: 0 | 1;
    @Column(DataType.INTEGER) webrole_id: WebRoleId;
    @Column price_per_unit: number;
    @Column duration: number;
    @Column({ defaultValue: 'months' }) duration_unit: 'days' | 'weeks' | 'months' | 'years';
    @Column(DataType.INTEGER) discount_percentage: number | null;
    @Column(DataType.INTEGER) max_age: number | null;
    @Column({ defaultValue: 1 }) show_in_overview: 0 | 1;
    @Column({ defaultValue: 1 }) recur_per_initial_period: 0 | 1;
    @Column(DataType.STRING) ab_test_id: string | null;
}

@Table({ tableName: 'custom_module_subscriptions' })
export class Subscription extends SubscriptionColumns {
    @HasOne(() => Subscription) testVariant?: Subscription;
    @HasMany(() => Coupon) coupons: Coupon[];

    get amount() {
        return parseFloat((this.recur_per_initial_period ? this.price_per_unit * this.duration : this.price_per_unit).toFixed(2));
    }

    static byId(subscriptionId: number | null) {
        if (!subscriptionId) {
            return undefined;
        }
        return this.findOne({
            where: { instance_id: subscriptionId },
        });
    }

    static byWebroleId(webroleId: WebRoleId) {
        return this.find({ webroleId, showInOverview: 1 });
    }

    static find({ webroleId, showInOverview }: { webroleId?: WebRoleId; showInOverview?: 0 | 1 }) {
        return this.findAll({
            where: {
                ...Util.pickDefinedValues({
                    webrole_id: webroleId,
                    show_in_overview: showInOverview,
                }),
                active: 1,
                original_subscription_id: null,
            },
            order: ['instance_id'],
            include: 'testVariant',
        });
    }

    static async isUsed(subscriptionId: number | string) {
        const counts = await Promise.all([
            this.sequelize.models.Payment.count({ where: { subscription_id: subscriptionId } }),
            this.sequelize.models.CustomUser.count({ where: { subscription_id: subscriptionId } }),
        ]);
        return counts.some(item => item > 0);
    }
}
