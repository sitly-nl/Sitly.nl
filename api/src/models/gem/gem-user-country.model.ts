import { Column, ForeignKey, Table } from 'sequelize-typescript';
import { MainBaseModel } from '../base.model';
import { Country } from './country.model';
import { GemUser } from './gem-user.model';

class GemUserCountryColumns extends MainBaseModel<GemUserCountryColumns, 'user_country_id'> {
    @Column({ primaryKey: true, autoIncrement: true }) user_country_id: number;
    @Column({ allowNull: false }) @ForeignKey(() => GemUser) user_id: number;
    @Column({ allowNull: false }) @ForeignKey(() => Country) country_id: number;
}

@Table({ tableName: 'core_users_countries' })
export class GemUserCountry extends GemUserCountryColumns {}
