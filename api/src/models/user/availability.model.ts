import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { CountryBaseModel } from '../base.model';
import { CustomUser } from './custom-user.model';

export class AvailabilityColumns extends CountryBaseModel<AvailabilityColumns, 'webuser_id'> {
    @Column({ primaryKey: true, autoIncrement: true })
    @ForeignKey(() => CustomUser)
    webuser_id: number;

    @Column(DataType.STRING) monday: string | null;
    @Column(DataType.STRING) tuesday: string | null;
    @Column(DataType.STRING) wednesday: string | null;
    @Column(DataType.STRING) thursday: string | null;
    @Column(DataType.STRING) friday: string | null;
    @Column(DataType.STRING) saturday: string | null;
    @Column(DataType.STRING) sunday: string | null;
}

@Table({ tableName: 'cms_webuser_availability' })
export class Availability extends AvailabilityColumns {}
