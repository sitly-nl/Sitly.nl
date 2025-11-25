import { Column, DataType, Table } from 'sequelize-typescript';
import { CountryBaseModel } from './base.model';
import { Op } from 'sequelize';

export class PostalCodeColumns extends CountryBaseModel<PostalCodeColumns, 'instance_id'> {
    @Column({ primaryKey: true, autoIncrement: true }) instance_id: number;
    @Column postal_code: number;
    @Column postal_code_max?: number;
    @Column province_name: string;
    @Column place_name: string;
    @Column(DataType.STRING) street_name: string | null;
}

@Table({ tableName: 'custom_module_postal_codes' })
export class PostalCode extends PostalCodeColumns {
    static byPostalCode(postalCode: string) {
        return this.findOne({ where: { postal_code: postalCode } });
    }

    static byPostalCodes(postalCode: string) {
        return this.findAll({
            // In MY this field is not added to table
            attributes: { exclude: ['postal_code_max'] },
            where: { postal_code: postalCode },
            order: ['street_name'],
        });
    }

    static byPostalCodeRange(postalCode: number) {
        if (Number.isNaN(postalCode)) {
            return null;
        }
        return this.findOne({
            where: {
                postal_code: { [Op.lte]: postalCode },
                postal_code_max: { [Op.gte]: postalCode },
            },
        });
    }
}
