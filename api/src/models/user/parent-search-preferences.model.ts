import { Column, ForeignKey, Table } from 'sequelize-typescript';
import { ColumnSet, CountryBaseModel } from '../base.model';
import { CustomUser, HourlyRate } from './custom-user.model';
import { FosterChores } from './foster-properties.model';

export class ParentSearchPreferencesColumns extends CountryBaseModel<ParentSearchPreferencesColumns, 'webuser_id'> {
    @Column({ primaryKey: true, autoIncrement: true })
    @ForeignKey(() => CustomUser)
    webuser_id: number;

    @ColumnSet chores: FosterChores[] | null;
    @ColumnSet hourly_rates: HourlyRate[] | null;
}

@Table({ tableName: 'cms_webuser_parent_search_preferences' })
export class ParentSearchPreferences extends ParentSearchPreferencesColumns {}
