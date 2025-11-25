import { Column, Table } from 'sequelize-typescript';
import { CountryBaseModel } from '../base.model';

export class SettingColumns extends CountryBaseModel<SettingColumns, 'instance_id'> {
    @Column({ primaryKey: true, autoIncrement: true }) instance_id: number;
    @Column json_ld_info: string;
    @Column social_pages: string;
    @Column facebook_app_id: string;
    @Column enable_google_optimize: 0 | 1;
}

@Table({ tableName: 'custom_module_settings' })
export class Setting extends SettingColumns {}
