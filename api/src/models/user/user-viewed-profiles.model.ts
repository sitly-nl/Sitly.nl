import { Column, Table, DataType } from 'sequelize-typescript';
import { CountryBaseModel } from '../base.model';

export class ViewedProfilesColumns extends CountryBaseModel<ViewedProfilesColumns, 'instance_id'> {
    @Column({ primaryKey: true, autoIncrement: true })
    instance_id: number;

    @Column viewer_id: number;
    @Column(DataType.INTEGER) viewed_webuser_id: number | null;
    @Column(DataType.DATE) viewed_at: Date;
}

@Table({ tableName: 'cms_webuser_viewed_profiles' })
export class ViewedProfiles extends ViewedProfilesColumns {}
