import { Column, ForeignKey, Table } from 'sequelize-typescript';
import { CountryBaseModel } from '../base.model';
import { CustomUser } from './custom-user.model';

export class FosterSearchPreferencesColumns extends CountryBaseModel<FosterSearchPreferencesColumns, 'webuser_id'> {
    @Column({ primaryKey: true, autoIncrement: true })
    @ForeignKey(() => CustomUser)
    webuser_id: number;
}

@Table({ tableName: 'cms_webuser_foster_search_preferences' })
export class FosterSearchPreferences extends FosterSearchPreferencesColumns {}
