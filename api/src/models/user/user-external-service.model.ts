import { Column, ForeignKey, Table, DataType } from 'sequelize-typescript';
import { CountryBaseModel } from '../base.model';
import { CustomUser } from './custom-user.model';

export class ExternalServicesColumns extends CountryBaseModel<ExternalServicesColumns, 'webuser_id'> {
    @Column({ primaryKey: true, autoIncrement: true })
    @ForeignKey(() => CustomUser)
    webuser_id: number;

    @Column(DataType.CHAR(32)) ga_client_id: string | null;
}

@Table({ tableName: 'cms_webuser_external_services' })
export class ExternalServices extends ExternalServicesColumns {}
