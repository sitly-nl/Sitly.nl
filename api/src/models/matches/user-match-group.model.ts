import { BelongsTo, Column, DataType, ForeignKey, HasMany, Table } from 'sequelize-typescript';
import { CountryBaseModel } from '../base.model';
import { User } from '../user/user.model';
import { UserNotificationMatch } from './user-match.model';
import { Includeable } from 'sequelize';
import { CustomUser } from '../user/custom-user.model';

export const userNotificationMatchGroupDefaultInclude: Includeable[] = [
    {
        association: 'user',
        include: [
            {
                association: 'customUser',
                include: ['locale'],
            },
        ],
    },
    {
        association: 'matches',
        separate: true,
        order: ['instance_order'],
        include: [
            {
                association: 'match',
                include: [
                    {
                        association: 'customUser',
                        include: CustomUser.includes(['children']),
                    },
                ],
            },
        ],
    },
];

// schema driven by Sequelize
export class UserNotificationMatchGroupColumns extends CountryBaseModel<
    UserNotificationMatchGroupColumns & { matches?: unknown[] },
    'match_group_id',
    'sent' | 'version'
> {
    @Column({ primaryKey: true, autoIncrement: true }) match_group_id: number;

    @Column
    @ForeignKey(() => User)
    webuser_id: number;

    @Column(DataType.DATE) created_at: Date;
    @Column({ defaultValue: 0 }) sent: 0 | 1 | 2;
    @Column total_matches: number;
    @Column({ defaultValue: 'a' }) version: 'a';
}

@Table({ tableName: 'cms_webuser_matches_groups' })
export class UserNotificationMatchGroup extends UserNotificationMatchGroupColumns {
    @BelongsTo(() => User) user: User;
    @HasMany(() => UserNotificationMatch) matches?: UserNotificationMatch[];

    static byUserId(userId: number) {
        return this.findOne({
            where: {
                webuser_id: userId,
            },
            include: {
                association: 'matches',
            },
            order: [
                ['created_at', 'DESC'],
                ['match_group_id', 'DESC'],
                ['matches', 'instance_order'],
            ],
        });
    }

    static matchesToSend(limit: number) {
        return this.findAll({
            where: { sent: 0 },
            limit,
            include: userNotificationMatchGroupDefaultInclude,
        });
    }
}
