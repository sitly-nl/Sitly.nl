import { Column, DataType, Table } from 'sequelize-typescript';
import { CountryBaseModel } from './base.model';

export enum UserExclusionType {
    hidden = 'hidden',
    blocked = 'blocked',
}

export class UserExclusionColumns extends CountryBaseModel<UserExclusionColumns, 'webuser_exclusion_id' | 'created_at'> {
    @Column({ primaryKey: true, autoIncrement: true }) webuser_exclusion_id: number;
    @Column({ allowNull: false }) webuser_id: number;
    @Column({ allowNull: false }) exclude_webuser_id: number;
    @Column({ allowNull: false }) exclude_type: UserExclusionType;
    @Column({ type: DataType.DATE, defaultValue: DataType.NOW }) created_at: Date;
}

@Table({ tableName: 'cms_webuser_exclusions' })
export class UserExclusion extends UserExclusionColumns {}
