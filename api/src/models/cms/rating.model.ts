import { BelongsTo, Column, DataType, ForeignKey, Sequelize, Table } from 'sequelize-typescript';
import { CountryBaseModel } from '../base.model';
import { Message } from '../message.model';
import { FetchPageInfo } from '../../routes/fetch-page-info';
import { WebRoleId } from '../user/user.model';
import { Op } from 'sequelize';

export class RatingColumns extends CountryBaseModel<RatingColumns, 'instance_id', 'active'> {
    @Column({ primaryKey: true, autoIncrement: true }) instance_id: number;

    @Column(DataType.NUMBER) @ForeignKey(() => Message) transaction_id: number | null;

    @Column({ defaultValue: 1 }) active: 0 | 1;
    @Column(DataType.NUMBER) rating: number | null;
    @Column(DataType.STRING) message: string | null;
    @Column(DataType.DATE) delivered: Date | null;
}

@Table({ tableName: 'custom_module_ratings' })
export class Rating extends RatingColumns {
    @BelongsTo(() => Message) transactionMessage?: Message;

    static async find(
        page: FetchPageInfo,
        where: { webrole_id?: WebRoleId; pref_babysitter?: 0 | 1; pref_childminder?: 0 | 1 },
        place?: string,
    ) {
        const options = {
            where: {
                active: 1,
                ...(page.number === 1 ? { rating: { [Op.gte]: 4 } } : {}),
            },
            include: {
                association: 'transactionMessage',
                required: true,
                include: [
                    {
                        association: 'sender',
                        where: {
                            ...(where.webrole_id ? { webrole_id: where.webrole_id } : {}),
                        },
                        include: [
                            {
                                association: 'customUser',
                                where: {
                                    ...(where.pref_babysitter ? { pref_babysitter: where.pref_babysitter } : {}),
                                    ...(where.pref_childminder ? { pref_childminder: where.pref_childminder } : {}),
                                },
                                include: [
                                    {
                                        association: 'place',
                                        ...(place ? { where: { place_url: place } } : {}),
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        };

        const ratingsPage1 = await this.findAndCountAll({
            ...options,
            offset: 0,
            limit: page.limit,
            order: [['delivered', 'DESC']],
        });

        if (page.number === 1) {
            return ratingsPage1;
        } else {
            const page1ids = ratingsPage1.rows.map(item => item.instance_id);
            return this.findAndCountAll({
                ...options,
                offset: page.offset,
                limit: page.limit,
                order:
                    page1ids.length > 0
                        ? [
                              [Sequelize.fn('FIELD', Sequelize.col('Rating.instance_id'), page1ids.join(',')), 'DESC'],
                              ['delivered', 'DESC'],
                          ]
                        : [['delivered', 'DESC']],
            });
        }
    }
}
