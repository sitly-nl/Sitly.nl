import { Column, DataType, Table } from 'sequelize-typescript';
import { ColumnDateOnly, CountryBaseModel } from './base.model';
import { User } from './user/user.model';

export class UserActivityColumns extends CountryBaseModel<UserActivityColumns, 'webuser_activity_id'> {
    @Column({ primaryKey: true, autoIncrement: true }) webuser_activity_id: number;

    @Column webuser_id: number;
    @ColumnDateOnly date: Date;
    @Column is_search_activity: 0 | 1;
    @Column(DataType.TINYINT) is_premium: 0 | 1 | null;
}

@Table({ tableName: 'custom_cms_webuser_activity' })
export class UserActivity extends UserActivityColumns {
    static async insertActivity(user: User, isSearchActivity: 0 | 1 = 0) {
        return this.upsert(
            {
                webuser_id: user.webuser_id,
                date: new Date(),
                is_premium: user.isPremium ? 1 : 0,
                is_search_activity: isSearchActivity,
            },
            { fields: ['webuser_id', 'date', 'is_premium', ...(isSearchActivity === 1 ? (['is_search_activity'] as const) : [])] },
        );
    }
}
