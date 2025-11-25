import { Column, DataType, Table } from 'sequelize-typescript';
import { MainBaseModel } from '../base.model';
import { BrandCode } from '../brand-code';

export class CountryColumns extends MainBaseModel<CountryColumns, 'country_id'> {
    @Column({ primaryKey: true, autoIncrement: true }) country_id: number;
    @Column(DataType.CHAR) country_code: BrandCode;
}

@Table({ tableName: 'core_countries' })
export class Country extends CountryColumns {
    static byCountryCodes(countryCodes: BrandCode[]) {
        return this.findAll({
            where: { country_code: countryCodes },
        });
    }

    static all() {
        return this.findAll();
    }
}
