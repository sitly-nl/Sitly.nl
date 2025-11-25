import { Message } from './message.model';
import { MessageType } from './message.types';
import { User } from './user/user.model';
import { getKnex } from '../knex';
import { UserExclusionType } from './user-exclusion.model';
import { CountryBaseModel } from './base.model';
import { Column, Table } from 'sequelize-typescript';
import { FetchPageInfo } from '../routes/fetch-page-info';
import { DateUtil } from '../utils/date-util';
import { Op, QueryTypes } from 'sequelize';

class ConversationColumns extends CountryBaseModel<ConversationColumns, 'chat_partner_id'> {
    @Column chat_partner_id: number;
    @Column unread_messages_count: number;
    @Column sent_messages_count: number;
    @Column total_messages_count: number;
    @Column current_user_started: number;
    @Column last_sent_message_id: number;
}

@Table
export class ConversationWrapperOld extends ConversationColumns {
    lastMessage: Message;
    chatPartner: User;

    private static getConversationQuery(
        webuserId: number,
        options: {
            includeInactive?: boolean;
            includeDeletedMessages?: boolean;
            page?: FetchPageInfo;
            countQuery?: boolean;
        },
        messageTypeFilter: MessageType[] = [],
    ) {
        // determine other userId of message based on own userId
        const chatPartnerIdSelect = `IF(sender_id = ${webuserId}, receiver_id, sender_id )`;

        // --- Sub query --- //
        const knex = getKnex();
        const subQuery = knex.queryBuilder();
        subQuery.from('custom_module_messages');
        subQuery.where('custom_module_messages.active', 1);
        subQuery.whereNot('custom_module_messages.message_type', MessageType.safetyTips);
        if (messageTypeFilter?.length > 0) {
            subQuery.whereIn('custom_module_messages.message_type', messageTypeFilter);
        }
        subQuery.select(knex.raw('MAX(created) as max_created'));
        subQuery.select(knex.raw(`${chatPartnerIdSelect} AS sub_chat_partner_id`));
        // select unread messages count of each conversation
        // a message is considered unread if the message is NOT read and the requesting user is the receiver of the message
        subQuery.select(knex.raw(`SUM(IF(NOT message_read AND receiver_id = ${webuserId}, 1, 0)) AS unread_messages_count`));
        subQuery.select(knex.raw(`SUM(IF(sender_id = ${webuserId}, 1, 0)) AS sent_messages_count`));
        subQuery.select(knex.raw(`SUM(IF(sender_id = ${webuserId} AND is_initial, 1, 0)) AS current_user_started`));
        subQuery.select(knex.raw('COUNT(1) AS total_messages_count'));
        if (!options.includeDeletedMessages) {
            subQuery.andWhere(query => {
                query.orWhereRaw('(receiver_id = ? AND receiver_deleted = 0)', webuserId);
                query.orWhereRaw('(sender_id = ? AND sender_deleted = 0)', webuserId);
            });
        } else {
            subQuery.andWhere(query => {
                query.orWhere('receiver_id', webuserId);
                query.orWhere('sender_id', webuserId);
            });
        }
        ['receiver_id', 'sender_id'].forEach(field => {
            subQuery.whereNotIn(
                field,
                knex
                    .select(knex.raw('IF(webuser_id = ?, exclude_webuser_id, webuser_id) as excluded_user_id', webuserId))
                    .from('cms_webuser_exclusions')
                    .where(qb => {
                        qb.where('webuser_id', webuserId).orWhere('exclude_webuser_id', webuserId);
                    })
                    .andWhere('exclude_type', UserExclusionType.blocked),
            );
        });
        subQuery.groupBy('sub_chat_partner_id');

        // --- Main query --- //
        const qb = knex.queryBuilder();
        // fetch all conversations
        qb.where('custom_module_messages.active', 1);
        qb.from('custom_module_messages');
        if (options.countQuery) {
            qb.select(knex.raw('count(distinct `sub_chat_partner_id`) as rowsCount'));
        } else {
            qb.select('instance_id AS last_sent_message_id');
            qb.select(knex.raw(`${chatPartnerIdSelect} AS chat_partner_id`));
            qb.select('unread_messages_count');
            qb.select('total_messages_count');
            qb.select('sent_messages_count');
            qb.select('current_user_started');
        }
        qb.andWhere(query => {
            query.orWhere('receiver_id', webuserId);
            query.orWhere('sender_id', webuserId);
        });

        const sub = knex.raw('(' + subQuery.toQuery() + ') AS m2');

        qb.innerJoin('cms_webusers as w', 'w.webuser_id', knex.raw(`${chatPartnerIdSelect}`));

        if (!options.includeInactive) {
            qb.where('w.active', 1);
        }

        // join last message sent in each conversation
        qb.innerJoin(
            sub,
            knex.raw(`(m2.sub_chat_partner_id = ${chatPartnerIdSelect} AND custom_module_messages.created = m2.max_created)`),
        );

        if (!options.countQuery) {
            qb.orderByRaw('custom_module_messages.created desc');
            qb.groupBy('sub_chat_partner_id');
            if (options.page) {
                qb.offset(options.page.offset);
                qb.limit(options.page.limit);
            } else {
                qb.limit(1_000);
            }
        }

        return qb;
    }

    static async getConversations(
        webuserId: number,
        options: {
            includeInactive?: boolean;
            includeDeletedMessages?: boolean;
        },
        messageTypeFilter: MessageType[] = [],
    ) {
        const sql = this.getConversationQuery(webuserId, options, messageTypeFilter).toSQL();
        const conversations = await this.sequelize.query({ query: sql.sql, values: sql.bindings as string[] }, { model: this });
        if (conversations.length > 0) {
            const [chatPartners, messages] = await Promise.all([
                this.sequelize.models.User.findAll({
                    where: { webuser_id: conversations.map(item => item.chat_partner_id) },
                    include: 'customUser',
                }),
                this.sequelize.models.Message.findAll({
                    where: { instance_id: conversations.map(item => item.last_sent_message_id) },
                }),
            ]);
            conversations.forEach(item => {
                const chatPartner = chatPartners.find(user => user.webuser_id === item.chat_partner_id);
                if (chatPartner) {
                    item.chatPartner = chatPartner;
                }
                const message = messages.find(message => message.instance_id === item.last_sent_message_id);
                if (message) {
                    item.lastMessage = message;
                }
            });
        }
        return conversations;
    }

    static async getConversationsAndCount(
        webuserId: number,
        options: {
            includeInactive?: boolean;
            includeDeletedMessages?: boolean;
            page: FetchPageInfo;
        },
        messageTypeFilter: MessageType[] = [],
    ) {
        const countSql = this.getConversationQuery(webuserId, { ...options, countQuery: true }, messageTypeFilter).toSQL();
        const [rows, countRes] = await Promise.all([
            this.getConversations(webuserId, options, messageTypeFilter),
            this.sequelize.query<{ rowsCount: number | undefined }>(
                { query: countSql.sql, values: countSql.bindings as string[] },
                { type: QueryTypes.SELECT },
            ),
        ]);
        return { rows, count: countRes[0]?.rowsCount ?? rows.length };
    }

    static async getUnRepliedConversationsCount(webuserId: number) {
        const res = await this.sequelize.models.Message.findAll({
            attributes: ['receiver_id'],
            include: {
                association: 'messages',
                attributes: [],
            },
            where: {
                'sender_id': webuserId,
                '$messages.sender_id$': null,
            },
            group: ['receiver_id'],
        });
        return res.length;
    }

    static async getConversationsCount(webuserId: number, sinceIsoDate?: Date) {
        const chatPartnerIdSelect = `IF(sender_id = ${webuserId}, receiver_id, sender_id )`;

        const knex = getKnex();
        const subQuery = knex.queryBuilder();
        subQuery.from('custom_module_messages');
        subQuery.select(knex.raw(`${chatPartnerIdSelect} AS chat_partner_id`));
        subQuery.andWhere(query => {
            query.orWhereRaw('(receiver_id = ? AND receiver_deleted = 0)', webuserId);
            query.orWhereRaw('(sender_id = ? AND sender_deleted = 0)', webuserId);
        });
        if (sinceIsoDate) {
            subQuery.andWhere('created', '>=', DateUtil.isoStringToTimestamp(sinceIsoDate.toISOString()));
        }
        subQuery.groupBy('chat_partner_id');

        const count = await this.sequelize.query<{ conversation_count: number }>(
            `SELECT COUNT(chat_partner_id) AS conversation_count FROM (${subQuery.toQuery()}) AS conversations`,
            { type: QueryTypes.SELECT },
        );

        return count[0].conversation_count;
    }

    static async markAsRead(self: number, other: number, lastReadMessageId: string) {
        try {
            await this.sequelize.models.Message.update(
                { message_read: 1 },
                {
                    where: {
                        sender_id: other,
                        receiver_id: self,
                        instance_id: {
                            [Op.lte]: lastReadMessageId,
                        },
                    },
                },
            );
        } catch (e) {
            console.trace(e);
        }
    }

    static async delete(self: number, other: number) {
        try {
            await this.sequelize.models.Message.update(
                { sender_deleted: 1 },
                {
                    where: {
                        sender_id: self,
                        receiver_id: other,
                    },
                },
            );
        } catch {}

        try {
            await this.sequelize.models.Message.update(
                { receiver_deleted: 1 },
                {
                    where: {
                        sender_id: other,
                        receiver_id: self,
                    },
                },
            );
        } catch {}
    }
}
