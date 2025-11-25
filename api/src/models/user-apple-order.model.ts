import { Column, DataType, Table } from 'sequelize-typescript';
import { BrandCode } from './brand-code';
import { MainBaseModel } from './base.model';

export class UserAppleOrderColumns extends MainBaseModel<UserAppleOrderColumns, 'webuser_apple_order_id'> {
    @Column({ primaryKey: true, autoIncrement: true }) webuser_apple_order_id: number;
    @Column(DataType.INTEGER) webuser_id: number;
    @Column(DataType.INTEGER) order_id: number;
    @Column({ type: DataType.ENUM(...Object.values(BrandCode)) }) country_code: BrandCode;
    @Column(DataType.CHAR) psp_reference: string | null;
}

@Table({ tableName: 'cms_webuser_apple_orders' })
export class UserAppleOrder extends UserAppleOrderColumns {
    static byTransactionId(transactionId: string) {
        return this.findOne({
            where: { psp_reference: transactionId },
        });
    }
}
