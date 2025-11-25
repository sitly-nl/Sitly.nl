import { Column, Table, ForeignKey, BelongsTo, DataType } from 'sequelize-typescript';
import { BaseModel } from '../../base.model';
import { User } from '../user.model';
import { UserSearch } from './user-search.model';

// schema driven by Sequelize
export class UserSearchResultColumns extends BaseModel<UserSearchResultColumns, 'search_result_id', 'notified_at'> {
    @Column({ primaryKey: true, autoIncrement: true })
    search_result_id: number;

    @Column({ allowNull: false })
    @ForeignKey(() => User)
    webuser_id: number;

    @Column({ allowNull: false })
    @ForeignKey(() => UserSearch)
    search_id: number;

    @Column({ allowNull: false }) search_score: number;
    @Column({ type: DataType.TINYINT, allowNull: false }) rank: number;

    @Column(DataType.DATE) notified_at: Date | null;
}

@Table({ tableName: 'user_search_results' })
export class UserSearchResult extends UserSearchResultColumns {
    @BelongsTo(() => User, { foreignKey: 'webuser_id', onDelete: 'CASCADE' }) user: User;
    @BelongsTo(() => UserSearch, { foreignKey: 'search_id', onDelete: 'CASCADE' }) search: UserSearch;
}
