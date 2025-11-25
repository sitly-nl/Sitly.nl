import { Column, Table, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { BaseModel } from '../../base.model';
import { User } from '../user.model';
import { Sequelize } from 'sequelize';
import { UserSearchResult } from './user-search-result.model';

// schema driven by Sequelize
export class UserSearchColumns extends BaseModel<UserSearchColumns, 'search_id', 'search_time'> {
    @Column({ primaryKey: true, autoIncrement: true })
    search_id: number;

    @Column({ allowNull: false, unique: true })
    @ForeignKey(() => User)
    webuser_id: number;

    @Column({ defaultValue: Sequelize.fn('current_timestamp') }) search_time: Date;
}

@Table({ tableName: 'user_searches' })
export class UserSearch extends UserSearchColumns {
    @BelongsTo(() => User, { foreignKey: 'webuser_id', onDelete: 'CASCADE' }) user: User;
    @HasMany(() => UserSearchResult) searchResults?: UserSearchResult[];
}
