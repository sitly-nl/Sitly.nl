import { BelongsTo, Column, CreatedAt, DataType, ForeignKey, Index, Table, UpdatedAt } from 'sequelize-typescript';
import { CountryBaseModel } from './base.model';
import { User } from './user/user.model';
import { Op, Sequelize } from 'sequelize';
import { CustomUser, CustomUserRelations } from './user/custom-user.model';
import { FetchPageInfo } from '../routes/fetch-page-info';
import { sub, subDays } from 'date-fns';

export enum ConnectionInviteStatus {
    open = 'open',
    ignored = 'ignored',
    accepted = 'accepted',
    expired = 'expired',
}

// schema driven by Sequelize
export class ConnectionInviteColumns extends CountryBaseModel<
    ConnectionInviteColumns,
    'connection_invite_id',
    'created_at' | 'updated_at' | 'invite_status'
> {
    @Column({ primaryKey: true, autoIncrement: true }) connection_invite_id: number;

    @Column({ allowNull: false })
    @ForeignKey(() => User)
    sender_id: number;

    @Column({ allowNull: false })
    @ForeignKey(() => User)
    receiver_id: number;

    @CreatedAt @Index created_at: Date;
    @UpdatedAt updated_at: Date;
    @Column(DataType.DATE) accepted_at: Date | null;
    @Column(DataType.DATE) rejected_at: Date | null;
    @Column(DataType.DATE) viewed_at: Date | null;

    @Column({ type: DataType.ENUM(...Object.values(ConnectionInviteStatus)), defaultValue: ConnectionInviteStatus.open })
    invite_status: ConnectionInviteStatus;
}

@Table({ tableName: 'connection_invites' })
export class ConnectionInvite extends ConnectionInviteColumns {
    @BelongsTo(() => User, { foreignKey: 'sender_id', onDelete: 'CASCADE' }) sender: User;
    @BelongsTo(() => User, { foreignKey: 'receiver_id', onDelete: 'CASCADE' }) receiver: User;

    static async find({
        type,
        userId,
        createdBefore,
        page,
        customUserIncludes,
    }: {
        type: 'sent' | 'received';
        userId: number;
        createdBefore: string;
        page: FetchPageInfo;
        customUserIncludes: (keyof CustomUserRelations)[];
    }) {
        return this.findAndCountAll({
            where: {
                ...(type === 'sent' ? { sender_id: userId } : { receiver_id: userId }),
                invite_status: ConnectionInviteStatus.open,
                created_at: { [Op.lte]: new Date(createdBefore) },
            },
            include: {
                association: type === 'sent' ? 'receiver' : 'sender',
                where: { active: 1 },
                include: [
                    {
                        association: 'customUser',
                        include: CustomUser.includes([...customUserIncludes, 'warnings']),
                        where: CustomUser.defaultWhere,
                    },
                ],
            },
            order: [['created_at', 'DESC']],
            limit: page.limit,
            offset: page.offset,
        });
    }

    static unviewedInvitesCount(receiverId: number) {
        return this.count({
            where: {
                receiver_id: receiverId,
                invite_status: ConnectionInviteStatus.open,
                viewed_at: null,
            },
            include: {
                association: 'sender',
                where: { active: 1 },
                include: [
                    {
                        association: 'customUser',
                        where: CustomUser.defaultWhere,
                    },
                ],
            },
        });
    }

    static markOutdatedInvitesAsExpired() {
        return this.update(
            { invite_status: ConnectionInviteStatus.expired },
            {
                where: {
                    invite_status: ConnectionInviteStatus.open,
                    created_at: { [Op.lte]: sub(new Date(), { days: 30 }) },
                },
            },
        );
    }

    static async getConnectionInvitesCountStatistic(senderId: number) {
        const timeGroups = await this.count({
            attributes: [
                [
                    Sequelize.literal(`
                        CASE
                            WHEN DATE_SUB(NOW(), INTERVAL 1 HOUR) < created_at
                                THEN 'last_hour' 
                            WHEN DATE_SUB(NOW(), INTERVAL 1 DAY) < created_at
                                THEN 'last_day'
                            WHEN DATE_SUB(NOW(), INTERVAL 1 WEEK) < created_at
                                THEN 'last_week' 
                            WHEN DATE_SUB(NOW(), INTERVAL 28 DAY) < created_at
                                THEN 'last_28_days' 
                            ELSE NULL 
                        END
                    `),
                    'time_group',
                ],
            ],
            where: {
                sender_id: senderId,
                created_at: {
                    [Op.gt]: subDays(new Date(), 28),
                },
            },
            group: 'time_group',
        });

        const keys = ['last_hour', 'last_day', 'last_week', 'last_28_days'] as const;
        return keys.reduce(
            (acc, cur, index) => {
                const previous = acc[keys[index - 1]];
                const current = timeGroups.find(model => model.time_group === cur);
                acc[cur] = (current?.count ?? 0) + (previous ?? 0);
                return acc;
            },
            {} as {
                last_hour: number;
                last_day: number;
                last_week: number;
                last_28_days: number;
            },
        );
    }
}
