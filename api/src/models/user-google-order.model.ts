import { Column, DataType, Table } from 'sequelize-typescript';
import { BrandCode } from './brand-code';
import { MainBaseModel } from './base.model';
import { Op } from 'sequelize';

export class UserGoogleOrderColumns extends MainBaseModel<UserGoogleOrderColumns, 'webuser_google_order_id'> {
    @Column({ primaryKey: true, autoIncrement: true }) webuser_google_order_id: number;
    @Column(DataType.INTEGER) webuser_id: number;
    @Column({ type: DataType.ENUM(...Object.values(BrandCode)) }) country_code: BrandCode;
    @Column(DataType.CHAR) psp_reference: string | null;
}

@Table({ tableName: 'cms_webuser_google_orders' })
export class UserGoogleOrder extends UserGoogleOrderColumns {
    static byTransactionId(transactionId: string) {
        return this.findOne({
            where: { psp_reference: transactionId },
        });
    }

    static byPartialPspReference(partialPspReference: string) {
        return this.findOne({
            where: { psp_reference: { [Op.startsWith]: partialPspReference } },
        });
    }
}
