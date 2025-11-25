import { BelongsTo, Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { CountryBaseModel } from '../base.model';
import { User } from '../user/user.model';
import { UserNotificationMatchGroup } from './user-match-group.model';

// schema driven by Sequelize
export class UserNotificationMatchColumns extends CountryBaseModel<UserNotificationMatchColumns, 'match_id'> {
    @Column({ primaryKey: true, autoIncrement: true }) match_id: number;

    @Column({ allowNull: false })
    @ForeignKey(() => UserNotificationMatchGroup)
    group_id: number;

    @Column
    @ForeignKey(() => User)
    webuser_id: number;

    @Column({ type: DataType.INTEGER }) instance_order: number | null;
}

@Table({ tableName: 'cms_webuser_matches' })
export class UserNotificationMatch extends UserNotificationMatchColumns {
    @BelongsTo(() => User) match: User;
}
