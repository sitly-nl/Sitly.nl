import { Column, ForeignKey, Table } from 'sequelize-typescript';
import { ColumnTimestamp, CountryBaseModel } from './base.model';
import { CustomUser } from './user/custom-user.model';

export class FavoriteColumns extends CountryBaseModel<FavoriteColumns, 'webuser_favorite_id'> {
    @Column({ primaryKey: true, autoIncrement: true }) webuser_favorite_id: number;

    @Column({ allowNull: false })
    @ForeignKey(() => CustomUser)
    webuser_id: number;

    @Column({ allowNull: false })
    @ForeignKey(() => CustomUser)
    favorite_id: number;

    @ColumnTimestamp favorite_time: Date;
}

@Table({ tableName: 'custom_cms_webuser_favorites' })
export class Favorite extends FavoriteColumns {}
