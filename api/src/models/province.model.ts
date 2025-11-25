import { Column, Table } from 'sequelize-typescript';
import { CountryBaseModel } from './base.model';
import { Op } from 'sequelize';

export class ProvinceColumns extends CountryBaseModel<ProvinceColumns, 'instance_id'> {
    @Column({ primaryKey: true, autoIncrement: true }) instance_id: number;
    @Column province_name: string;
    @Column province_url: string;
}

@Table({ tableName: 'custom_module_provinces' })
export class Province extends ProvinceColumns {
    static all() {
        return this.findAll();
    }
    static byKeyword(keyword: string) {
        return this.findAll({
            where: {
                province_name: { [Op.substring]: keyword },
            },
        });
    }
}
