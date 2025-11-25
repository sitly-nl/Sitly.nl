import { BelongsTo, Column, CreatedAt, DataType, ForeignKey, HasMany, Table } from 'sequelize-typescript';
import { CountryBaseModel } from './base.model';
import { User } from './user/user.model';
import { Message, MessageColumns } from './message.model';
import { Op, WhereOptions } from 'sequelize';

class ConversationColumns extends CountryBaseModel<
    ConversationColumns,
    'conversation_id',
    'created_at' | 'successful_at' | 'users_ids_combo'
> {
    @Column({ primaryKey: true, autoIncrement: true }) conversation_id: number;

    @Column({ allowNull: false })
    @ForeignKey(() => User)
    user1_id: number;

    @Column({ allowNull: false })
    @ForeignKey(() => User)
    user2_id: number;

    @CreatedAt created_at: Date;
    @Column(DataType.DATE) successful_at: Date | null;
    @Column users_ids_combo: string;
}

@Table({
    tableName: 'conversations',
    updatedAt: false,
})
export class Conversation extends ConversationColumns {
    @BelongsTo(() => User, { foreignKey: 'user1_id', onDelete: 'CASCADE' }) user1?: User;
    @BelongsTo(() => User, { foreignKey: 'user2_id', onDelete: 'CASCADE' }) user2?: User;
    @HasMany(() => Message) messages?: Message[];

    static async conversationForUsers(user1Id: number, user2Id: number) {
        return this.sequelize.models.Conversation.findOne({
            where: {
                users_ids_combo: [user1Id, user2Id].sort((a, b) => a - b).join(','),
            },
        });
    }

    static async findOrCreateForUsers(user1Id: number, user2Id: number) {
        return this.sequelize.models.Conversation.findOrCreate({
            where: {
                [Op.or]: [
                    { user1_id: user1Id, user2_id: user2Id },
                    { user1_id: user2Id, user2_id: user1Id },
                ],
            },
            defaults: {
                user1_id: user1Id,
                user2_id: user2Id,
            },
        });
    }

    static async conversationsForUsers(user1Id: number, user2Ids: number[]) {
        return this.sequelize.models.Conversation.findAll({
            where: {
                users_ids_combo: user2Ids.map(item => [user1Id, item].sort((a, b) => a - b).join(',')),
            },
        });
    }

    messagesCount(where: WhereOptions<MessageColumns>) {
        return this.sequelize.models.Message.count({
            where: {
                ...where,
                conversation_id: this.conversation_id,
            },
        });
    }
}
