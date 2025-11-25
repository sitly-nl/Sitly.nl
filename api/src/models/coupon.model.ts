import { BelongsTo, Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { CountryBaseModel } from './base.model';
import { Subscription } from './subscription.model';

// schema driven by Sequelize
export class CouponColumns extends CountryBaseModel<CouponColumns, 'coupon_id', 'active'> {
    @Column({ primaryKey: true, autoIncrement: true }) coupon_id: number;

    @Column({ allowNull: false, unique: 'subscription-code-unique' })
    @ForeignKey(() => Subscription)
    subscription_id: number;

    @Column({ allowNull: false }) discount_percentage: number;
    @Column({ allowNull: false, unique: 'subscription-code-unique' }) coupon_code: string;
    @Column({ defaultValue: 1, type: DataType.TINYINT }) active: 0 | 1;
    @Column({ allowNull: false }) start_date: Date;
    @Column(DataType.DATE) end_date: Date | null;
}

@Table({ tableName: 'coupons' })
export class Coupon extends CouponColumns {
    @BelongsTo(() => Subscription, { foreignKey: 'subscription_id', onDelete: 'CASCADE' }) subscription: Subscription;
}
