import { Column, DataType, Table, ForeignKey } from 'sequelize-typescript';
import { CountryBaseModel } from './base.model';
import { CustomUser } from './user/custom-user.model';

export enum DeviceType {
    ios = 'ios',
    android = 'android',
    web = 'web',
}

export class DeviceColumns extends CountryBaseModel<
    DeviceColumns,
    'instance_id',
    'active' | 'instance_order' | 'updated_at' | 'inserted_at'
> {
    @Column({ primaryKey: true, autoIncrement: true, type: DataType.INTEGER }) instance_id: number;

    @Column({ allowNull: false })
    @ForeignKey(() => CustomUser)
    webuser_id: number;

    @Column({ allowNull: false, type: DataType.ENUM(...Object.values(DeviceType)) }) device_type: DeviceType;
    @Column({ type: DataType.STRING, allowNull: false }) fcm_token: string;
    @Column({ type: DataType.STRING }) device_token?: string | null;
    @Column({ type: DataType.TINYINT, defaultValue: 1 }) active: number;
    @Column({ type: DataType.TINYINT, defaultValue: 999999 }) instance_order: number;
    @Column({ type: DataType.DATE, defaultValue: DataType.NOW }) updated_at: Date;
    @Column({ type: DataType.DATE, defaultValue: DataType.NOW }) inserted_at: Date;
}

@Table({ tableName: 'custom_module_devices' })
export class Device extends DeviceColumns {
    static byFcmToken(token: string) {
        return this.findOne({ where: { fcm_token: token } });
    }
}
