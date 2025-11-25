import { Column, ForeignKey, Table } from 'sequelize-typescript';
import { CountryBaseModel } from './base.model';
import { CustomUser } from './user/custom-user.model';

export class ReferenceColumns extends CountryBaseModel<ReferenceColumns, 'instance_id'> {
    @Column({ primaryKey: true, autoIncrement: true }) instance_id: number;

    @Column @ForeignKey(() => CustomUser) webuser_id: number;

    @Column({ allowNull: false }) last_name: string;
    @Column({ allowNull: false }) description: string;
}

@Table({ tableName: 'custom_module_references' })
export class Reference extends ReferenceColumns {
    static byId(referenceId: number | string) {
        return this.findOne({ where: { instance_id: referenceId } });
    }
}
