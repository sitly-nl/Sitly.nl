import { Column, DataType, Table } from 'sequelize-typescript';
import { BrandCode } from './brand-code';
import { MainBaseModel } from './base.model';
import { Op } from 'sequelize';

export class UserCountryColumns extends MainBaseModel<UserCountryColumns, 'webuser_country_id'> {
    @Column({ primaryKey: true, autoIncrement: true }) webuser_country_id: number;
    @Column(DataType.INTEGER) webuser_id: number;
    @Column({ type: DataType.ENUM(...Object.values(BrandCode)) }) country_code: BrandCode;
    @Column(DataType.CHAR) email: string | null;
    @Column(DataType.CHAR) facebook_id: string | null;
}

@Table({ tableName: 'cms_webuser_countries' })
export class UserCountry extends UserCountryColumns {
    static byEmail(email: string) {
        return this.findAll({
            where: { email },
            order: [['webuser_country_id', 'DESC']],
        });
    }

    static byEmailOrFacebookId(email: string, facebookId: string) {
        return this.findOne({
            where: {
                [Op.or]: [{ email }, { facebook_id: facebookId }],
            },
            order: [['webuser_country_id', 'DESC']],
        });
    }
}
