import { AfterCreate, BeforeCreate, BelongsTo, Column, DataType, ForeignKey, HasMany, HasOne, Table } from 'sequelize-typescript';
import { ColumnTimestamp, CountryBaseModel } from './base.model';
import { UserWarningLevel } from '../types';
import { MessageType, MessagesCountStatistic } from './message.types';
import { User } from './user/user.model';
import { getKnex } from '../knex';
import { UserWarning } from './user-warning.model';
import { JobPosting } from './job-posting.model';
import { DateUtil } from '../utils/date-util';
import { FetchPageInfo } from '../routes/fetch-page-info';
import { Op, Order, QueryTypes, Sequelize } from 'sequelize';
import { Conversation } from './conversation.model';

interface GetMessagesFilters {
    'created-before': string;
    'created-after': string;
    'unread': boolean;
    'hide-messages-with-type': string;
}

export class MessageColumns extends CountryBaseModel<
    MessageColumns,
    'instance_id',
    'active' | 'message_type' | 'message_read' | 'notified' | 'is_initial' | 'sender_deleted' | 'receiver_deleted' | 'blocked'
> {
    @Column({ primaryKey: true, autoIncrement: true }) instance_id: number;

    @Column(DataType.INTEGER)
    @ForeignKey(() => JobPosting)
    job_posting_id: number | null;

    @Column(DataType.INTEGER)
    @ForeignKey(() => Message)
    receiver_id: number | null;

    @Column(DataType.INTEGER)
    @ForeignKey(() => Message)
    sender_id: number | null;

    @Column(DataType.INTEGER)
    @ForeignKey(() => Conversation)
    conversation_id: number | null;

    @Column(DataType.STRING) sender_name: string | null;
    @Column({ allowNull: false, defaultValue: 1 }) active: 0 | 1;
    @Column({ allowNull: false, defaultValue: 0 }) message_read: 0 | 1;
    @Column({ allowNull: false, defaultValue: 0 }) notified: 0 | 1;
    @Column({ allowNull: false, defaultValue: 0 }) is_initial: 0 | 1;
    @Column({ allowNull: false, defaultValue: 0 }) sender_deleted: 0 | 1;
    @Column({ allowNull: false, defaultValue: 0 }) receiver_deleted: 0 | 1;
    @Column({ allowNull: false, defaultValue: 0 }) blocked: 0 | 1;

    @Column({ allowNull: false }) content: string;
    @Column(DataType.STRING) subject: string | null;
    @ColumnTimestamp created: Date | null;
    @Column({
        allowNull: false,
        type: DataType.ENUM(...Object.values(MessageType)),
        defaultValue: MessageType.regular,
    })
    message_type: MessageType;
    @Column({ type: DataType.ENUM(...Object.values(UserWarningLevel)) }) warning_level: UserWarningLevel | null;
}

@Table({ tableName: 'custom_module_messages' })
export class Message extends MessageColumns {
    @HasOne(() => UserWarning) warning?: UserWarning;
    @BelongsTo(() => JobPosting) jobPosting?: JobPosting;
    @BelongsTo(() => User, 'sender_id') sender?: User;
    @BelongsTo(() => User, 'receiver_id') receiver?: User;
    @HasMany(() => Message, {
        foreignKey: 'sender_id',
        sourceKey: 'receiver_id',
    })
    messages: Message[];

    @BeforeCreate
    static async updateConversationId(instance: Message) {
        if (instance.conversation_id || !instance.sender_id || !instance.receiver_id) {
            return;
        }

        const result = await this.sequelize.models.Conversation.findOrCreateForUsers(instance.sender_id, instance.receiver_id);
        instance.conversation_id = result[0].conversation_id;
    }

    @AfterCreate
    static updateCustomWebuser(instance: Message) {
        if (instance.message_type === MessageType.regular) {
            return Promise.all(
                [instance.sender_id, instance.receiver_id]
                    .filter(item => item !== null)
                    .map(async id => {
                        const responseRate = await this.getResponseRate(id);
                        return instance.sequelize.models.CustomUser.update(
                            {
                                received_messages_count: responseRate.receivedCount,
                                answered_messages_count: responseRate.answeredCount,
                            },
                            { where: { webuser_id: id } },
                        );
                    }),
            );
        }
    }

    static byId(messageId: number) {
        return this.findOne({ where: { instance_id: messageId } });
    }

    static getLastMessage(webuserId: number) {
        return this.findOne({
            where: { sender_id: webuserId },
            order: [['created', 'DESC']],
        });
    }

    private static defaultFindMessagesOptions(
        webuserId1: number,
        webuserId2: number,
        filters: Partial<GetMessagesFilters> = {},
        options: {
            includeDeletedMessages?: boolean;
        } = {},
    ) {
        return {
            where: [
                {
                    [Op.or]: [
                        {
                            sender_id: webuserId2,
                            receiver_id: webuserId1,
                            ...(options.includeDeletedMessages ? {} : { receiver_deleted: 0 }),
                        },
                        {
                            receiver_id: webuserId2,
                            sender_id: webuserId1,
                            ...(options.includeDeletedMessages ? {} : { sender_deleted: 0 }),
                        },
                    ],
                },
                {
                    [Op.or]: [{ message_type: { [Op.ne]: MessageType.safetyTips } }, { sender_id: webuserId1 }],
                },
                { active: 1 },
                filters['created-before'] ? { created: { [Op.lt]: DateUtil.isoStringToTimestamp(filters['created-before']) } } : {},
                filters['created-after'] ? { created: { [Op.gt]: DateUtil.isoStringToTimestamp(filters['created-after']) } } : {},
                filters.unread ? { message_read: 0 } : {},
                filters['hide-messages-with-type'] ? { message_type: { [Op.ne]: filters['hide-messages-with-type'] } } : {},
            ],
            order: [
                ['created', 'DESC'],
                ['instance_id', 'DESC'],
            ] as Order,
        };
    }

    static async getMessages(
        webuserId1: number,
        webuserId2: number,
        filters: Partial<GetMessagesFilters> = {},
        options: { includeDeletedMessages?: boolean } = {},
    ) {
        return this.findAll(this.defaultFindMessagesOptions(webuserId1, webuserId2, filters, options));
    }

    static async getMessagesAndCount(
        webuserId1: number,
        webuserId2: number,
        filters: Partial<GetMessagesFilters> | undefined,
        options: {
            includeDeletedMessages?: boolean;
            page: FetchPageInfo;
        },
    ) {
        return this.findAndCountAll({
            ...this.defaultFindMessagesOptions(webuserId1, webuserId2, filters, options),
            offset: options.page.offset,
            limit: options.page.limit,
        });
    }

    static getSentMessages(senderId: number, receiverId: number) {
        return this.findAll({
            where: {
                sender_id: senderId,
                receiver_id: receiverId,
            },
            order: [['created', 'DESC']],
        });
    }

    static async getMessagesCount(userId1: number, userId2: number) {
        return this.count({
            where: {
                active: 1,
                message_type: { [Op.ne]: MessageType.instantJob },
                [Op.or]: [
                    {
                        receiver_id: userId1,
                        sender_id: userId2,
                        receiver_deleted: 0,
                    },
                    {
                        receiver_id: userId2,
                        sender_id: userId1,
                        sender_deleted: 0,
                    },
                ],
            },
        });
    }

    static async getSentMessagesCount(senderId: number, receiverId: number) {
        return this.count({
            where: {
                sender_id: senderId,
                receiver_id: receiverId,
            },
        });
    }

    static async safetyMessagesCount(senderId: number) {
        return this.count({
            where: {
                sender_id: senderId,
                message_type: MessageType.safetyTips,
            },
        });
    }

    static getReceivedMessagesCount(receiverId: number, messageType: MessageType) {
        return this.count({
            where: {
                sender_id: { [Op.not]: null },
                receiver_id: receiverId,
                message_type: messageType,
            },
        });
    }

    static async getTotalUnreadMessagesCount(receiverId: number, messageTypeFilter: MessageType[] = []) {
        return this.count({
            where: {
                receiver_id: receiverId,
                message_read: 0,
                receiver_deleted: 0,
                sender_id: { [Op.ne]: null },
                message_type: { [Op.ne]: MessageType.safetyTips },
                ...(messageTypeFilter.length > 0
                    ? {
                          [Op.and]: { message_type: { [Op.in]: messageTypeFilter } },
                      }
                    : {}),
            },
            col: 'instance_id',
        });
    }

    static async getUserStatistics(userId: number) {
        const knex = getKnex();
        const qb = knex.queryBuilder();
        qb.from('custom_module_messages');
        qb.select([
            knex.raw('COUNT(1) as message_count'),
            knex.raw(`IF(sender_id = ${userId}, 'sent', 'received') as message_action`),
            'is_initial',
        ]);
        qb.andWhere(qb => {
            qb.orWhere('sender_id', userId);
            qb.orWhere('receiver_id', userId);
        });
        qb.whereIn('message_type', [MessageType.regular, MessageType.autoRejection]);
        qb.groupBy('message_action');
        qb.groupBy('is_initial');

        const sql = qb.toSQL();
        const models = await this.sequelize.query<{ message_action: string; message_count: number; is_initial: number }>(
            { query: sql.sql, values: sql.bindings as string[] },
            { type: QueryTypes.SELECT },
        );
        return models.reduce(
            (acc, current) => {
                if (current.message_action === 'received') {
                    acc.receivedMessageCount += current.message_count;
                }

                if (current.message_action === 'sent') {
                    acc.sentMessageCount += current.message_count;

                    if (current.is_initial === 1) {
                        acc.initialMessageCount += current.message_count;
                    }
                }

                return acc;
            },
            {
                initialMessageCount: 0,
                sentMessageCount: 0,
                receivedMessageCount: 0,
            },
        );
    }

    static async getResponseRate(userId: number) {
        if (typeof userId === 'string') {
            userId = parseInt(userId, 10);
        }

        const knex = getKnex();

        const subQuery = knex.queryBuilder();
        subQuery.from('custom_module_messages');
        subQuery.select([
            knex.raw(`IF(GROUP_CONCAT(sender_id) LIKE CONCAT('%', ${userId}, '%'), 'answered', 'unanswered') AS conversation_status`),
        ]);
        subQuery.join('custom_cms_webusers AS cw', knex.raw(`(cw.webuser_id = IF(sender_id = ${userId}, receiver_id, sender_id))`));
        subQuery.andWhere(qb => {
            qb.orWhere('sender_id', userId);
            qb.orWhere(qb => {
                qb.andWhere('receiver_id', userId);
                qb.andWhere('receiver_deleted', 0);
            });
        });
        subQuery.andWhere({
            'cw.deleted': 0,
            'cw.disabled': 0,
            'cw.inappropriate': 0,
            'message_type': MessageType.regular,
        });
        subQuery.groupBy(knex.raw(`IF(sender_id = ${userId}, receiver_id, sender_id)`));
        // only select conversations in which the user has received a message
        subQuery.having(knex.raw(`FIND_IN_SET(${userId}, GROUP_CONCAT(receiver_id))`));

        const query = knex
            .queryBuilder()
            .from('custom_module_messages')
            .select([knex.raw('COUNT(1) as conversation_count'), 'conversation_status'])
            .from(subQuery.as('sub'))
            .groupBy<[{ conversation_status: string; conversation_count: number }]>('conversation_status');
        const sql = query.toSQL();
        const result = await this.sequelize.query<{ conversation_count: number; conversation_status: string }>(
            { query: sql.sql, values: sql.bindings as string[] },
            { type: QueryTypes.SELECT },
        );

        return result.reduce(
            (acc, current) => {
                if (current.conversation_status === 'unanswered') {
                    acc.unansweredCount += current.conversation_count;
                }

                if (current.conversation_status === 'answered') {
                    acc.answeredCount += current.conversation_count;
                }

                acc.receivedCount += current.conversation_count;

                return acc;
            },
            {
                receivedCount: 0,
                answeredCount: 0,
                unansweredCount: 0,
            },
        );
    }

    static async getReceiverIdsBySenderId(webuserId: number) {
        const messagesQb = getKnex()
            .select('custom_module_messages.receiver_id')
            .from('custom_module_messages')
            .where('custom_module_messages.sender_id', webuserId)
            .groupBy('custom_module_messages.receiver_id')
            .join('custom_module_messages as m2', function () {
                this.on('custom_module_messages.receiver_id', '=', 'm2.sender_id').andOn(
                    'custom_module_messages.sender_id',
                    '=',
                    'm2.receiver_id',
                );
            });
        const sql = messagesQb.toSQL();
        const res = await this.sequelize.query({ query: sql.sql, values: sql.bindings as string[] }, { model: this });
        return res.map(model => model.receiver_id).filter(item => item !== null);
    }

    static async getInitialMessageCountStatistic(senderId: number) {
        const models = await this.count({
            attributes: [
                [
                    Sequelize.literal(`
                        CASE
                            WHEN DATE_SUB(NOW(), INTERVAL 1 HOUR) < FROM_UNIXTIME(created) 
                                THEN 'last_hour' 
                            WHEN DATE_SUB(NOW(), INTERVAL 1 DAY) < FROM_UNIXTIME(created) 
                                THEN 'last_day'
                            WHEN DATE_SUB(NOW(), INTERVAL 2 DAY) < FROM_UNIXTIME(created) 
                                THEN 'last_2_days' 
                            WHEN DATE_SUB(NOW(), INTERVAL 1 WEEK) < FROM_UNIXTIME(created) 
                                THEN 'last_week' 
                            WHEN DATE_SUB(NOW(), INTERVAL 1 MONTH) < FROM_UNIXTIME(created) 
                                THEN 'last_month' 
                            ELSE NULL 
                        END
                    `),
                    'time_group',
                ],
                [Sequelize.literal('MIN(`created`)'), 'first_message_created'],
            ],
            where: {
                sender_id: senderId,
                message_type: MessageType.regular,
                is_initial: 1,
            },
            group: 'time_group',
        });

        const keys = ['last_hour', 'last_day', 'last_2_days', 'last_week', 'last_month'] as const;
        return keys.reduce((acc, cur, index) => {
            const previous = acc[keys[index - 1]];
            const current = models.find(model => model.time_group === cur);
            acc[cur] = {
                count: (current?.count ?? 0) + (previous?.count ?? 0),
                first_message_created: ((current?.first_message_created ?? previous?.first_message_created) as number) ?? 0,
            };
            return acc;
        }, {} as MessagesCountStatistic);
    }

    static async warnReceivers(senderId: number) {
        try {
            const knex = getKnex();
            const qb = knex.queryBuilder();
            qb.select([knex.raw('MAX(instance_id) AS last_sent_message_id')])
                .from('custom_module_messages')
                .where({
                    sender_id: senderId,
                })
                .groupBy('receiver_id')
                .having(knex.raw("GROUP_CONCAT(warning_level) NOT LIKE '%moderate%' OR GROUP_CONCAT(warning_level) IS NULL"));
            const sql = qb.toSQL();
            const models = await this.sequelize.query<{ last_sent_message_id: number }>(
                { query: sql.sql, values: sql.bindings as string[] },
                { type: QueryTypes.SELECT },
            );
            await this.update(
                { warning_level: UserWarningLevel.moderate },
                { where: { sender_id: senderId, instance_id: models.map(model => model.last_sent_message_id) } },
            );
        } catch (e) {
            console.trace(e);
        }
    }

    static async resendBlockedMessages(senderIds: number[]) {
        return this.update(
            {
                receiver_deleted: 0,
                blocked: 0,
                notified: Sequelize.literal('IF(FROM_UNIXTIME(created) > DATE_SUB(NOW(), INTERVAL 3 DAY), 0, 1)'),
            },
            {
                where: {
                    sender_id: senderIds,
                    blocked: 1,
                },
            },
        );
    }

    static async blockAllMessages(senderIds: number[]) {
        return this.update(
            {
                receiver_deleted: 1,
                notified: 1,
                blocked: 1,
            },
            { where: { sender_id: senderIds } },
        );
    }
}
