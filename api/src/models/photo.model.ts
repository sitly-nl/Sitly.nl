import { Column, ForeignKey, Table } from 'sequelize-typescript';
import { Environment } from '../services/env-settings.service';
import { CountryBaseModel } from './base.model';
import { CustomUser } from './user/custom-user.model';

export class PhotoColumns extends CountryBaseModel<PhotoColumns, 'instance_id', 'instance_order'> {
    @Column({ primaryKey: true, autoIncrement: true }) instance_id: number;

    @Column
    @ForeignKey(() => CustomUser)
    webuser_id: number;

    @Column({ defaultValue: 0 }) instance_order: number;
    @Column photo: string;
}

@Table({ tableName: 'custom_module_photos' })
export class Photo extends PhotoColumns {
    static byId(photoId: string) {
        return this.findOne({ where: { instance_id: photoId } });
    }

    link(userId: string) {
        return `${Environment.apiKeys.cdn_url}/${this.brandCode}/photos/${userId}/${this.photo}`;
    }
}
