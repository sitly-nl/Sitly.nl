import { BelongsTo, Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { FetchPageInfo } from '../routes/fetch-page-info';
import { CountryBaseModel } from './base.model';
import { CustomUser } from './user/custom-user.model';
import { User, WebRoleId } from './user/user.model';

export class FeedbackColumns extends CountryBaseModel<FeedbackColumns, 'instance_id' | 'created_at'> {
    @Column({ primaryKey: true, autoIncrement: true }) instance_id: number;

    @Column(DataType.INTEGER) @ForeignKey(() => CustomUser) webuser_id: number | null;

    @Column category: string;
    @Column feedback: string;
    @Column({ type: DataType.DATE, defaultValue: DataType.NOW }) created_at: Date;
}

@Table({ tableName: 'custom_module_feedbacks' })
export class Feedback extends FeedbackColumns {
    @BelongsTo(() => User, 'webuser_id') user: User;

    static find({ webroleId, page }: { webroleId: WebRoleId; page?: FetchPageInfo }) {
        return this.findAndCountAll({
            order: [['instance_id', 'DESC']],
            limit: page?.limit ?? 100,
            offset: page?.offset ?? 0,
            include: {
                association: 'user',
                where: { webrole_id: webroleId },
                include: ['customUser'],
            },
        });
    }
}
