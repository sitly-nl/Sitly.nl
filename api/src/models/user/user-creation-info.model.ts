import { Column, ForeignKey, Table, DataType } from 'sequelize-typescript';
import { CountryBaseModel } from '../base.model';
import { CustomUser } from './custom-user.model';

export class UserCreationInfoColumns extends CountryBaseModel<UserCreationInfoColumns, 'webuser_id'> {
    @Column({ primaryKey: true, autoIncrement: true })
    @ForeignKey(() => CustomUser)
    webuser_id: number;

    @Column(DataType.STRING) utm_campaign: string | null;
    @Column(DataType.STRING) utm_source: string | null;
    @Column(DataType.STRING) utm_full_referrer: string | null;
    @Column(DataType.STRING) sitly_platform: string | null;
    @Column(DataType.STRING) device_type: string | null;
    @Column(DataType.STRING) utm_content: string | null;
    @Column(DataType.STRING) utm_medium: string | null;
    @Column(DataType.STRING) utm_term: string | null;
}

@Table({ tableName: 'cms_webuser_creation_info' })
export class UserCreationInfo extends UserCreationInfoColumns {}
