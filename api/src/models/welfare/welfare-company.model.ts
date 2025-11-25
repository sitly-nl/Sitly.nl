import { Column, DataType, HasMany, Table } from 'sequelize-typescript';
import { CountryBaseModel } from '../base.model';
import { WelfareVoucher } from './welfare-voucher.model';

export class WelfareCompanyColumns extends CountryBaseModel<WelfareCompanyColumns, 'company_id'> {
    @Column({ primaryKey: true, autoIncrement: true }) company_id: number;
    @Column name: string;
    @Column(DataType.STRING) address: string | null;
    @Column(DataType.STRING) contact_person: string | null;
    @Column(DataType.STRING) contact_email: string | null;
}

@Table({ tableName: 'welfare_companies' })
export class WelfareCompany extends WelfareCompanyColumns {
    @HasMany(() => WelfareVoucher) vouchers?: WelfareVoucher[];
}
