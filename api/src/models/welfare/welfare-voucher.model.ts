import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { CountryBaseModel } from '../base.model';
import { WelfareCompany } from './welfare-company.model';

export class WelfareVoucherColumns extends CountryBaseModel<WelfareVoucherColumns, 'instance_id', 'used'> {
    @Column({ primaryKey: true, autoIncrement: true }) instance_id: number;

    @Column @ForeignKey(() => WelfareCompany) company_id: number;

    @Column code: string;
    @Column(DataType.INTEGER) period: number;
    @Column month_price: number;
    @Column({ defaultValue: 0 }) used: 0 | 1;
}

@Table({ tableName: 'welfare_vouchers' })
export class WelfareVoucher extends WelfareVoucherColumns {}
