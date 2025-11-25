import { Column, DataType, ForeignKey, Sequelize, Table } from 'sequelize-typescript';
import { ColumnDateOnly, CountryBaseModel } from './base.model';
import { CustomUser } from './user/custom-user.model';
import { MessageType } from './message.types';
import { Op } from 'sequelize';

export enum JobPostingState {
    initial = 'initial',
    finished = 'finished',
    completedSuccessfully = 'completedSuccessfully',
    completedUnsuccessfully = 'completedUnsuccessfully',
}

export class JobPostingColumns extends CountryBaseModel<JobPostingColumns, 'instance_id' | 'created_at', 'state' | 'batch_count'> {
    @Column({ primaryKey: true, autoIncrement: true }) instance_id: number;

    @Column({ allowNull: false })
    @ForeignKey(() => CustomUser)
    webuser_id: number;

    @Column filter: string;
    @Column({ type: DataType.STRING(64), defaultValue: JobPostingState.initial }) state: JobPostingState;
    @Column({ defaultValue: DataType.NOW }) created_at: Date;
    @Column(DataType.DATE) last_sent_at: Date | null;
    @ColumnDateOnly start_at: Date;
    @Column({ defaultValue: 0 }) batch_count: number;
    @Column(DataType.INTEGER) handle_start_time_exceed: 0 | 1 | null;
}

@Table({ tableName: 'custom_module_job_postings' })
export class JobPosting extends JobPostingColumns {
    static byId(jobPostingId: number) {
        return this.findOne({ where: { instance_id: jobPostingId } });
    }

    static byUserId(userId: number) {
        return this.findOne({
            where: [
                { webuser_id: userId },
                { state: { [Op.not]: JobPostingState.completedUnsuccessfully } },
                { state: { [Op.not]: JobPostingState.completedSuccessfully } },
            ],
        });
    }

    static initial() {
        return this.findAll({ where: { state: JobPostingState.initial } });
    }

    repliesCount() {
        return this.sequelize.models.Message.count({
            where: {
                job_posting_id: this.instance_id,
                message_type: MessageType.jobPostingReply,
            },
        });
    }

    static uncompleted() {
        return this.findAll({
            where: {
                state: {
                    [Op.not]: [JobPostingState.completedSuccessfully, JobPostingState.completedUnsuccessfully],
                },
            },
        });
    }

    static active() {
        return this.findAll({
            where: {
                state: JobPostingState.initial,
                [Op.or]: [
                    {
                        start_at: { [Op.lt]: Sequelize.literal('NOW() + INTERVAL 48 HOUR') },
                        [Op.or]: [{ last_sent_at: null }, { last_sent_at: { [Op.lt]: Sequelize.literal('NOW() - INTERVAL 10 HOUR') } }],
                    },
                    {
                        start_at: { [Op.gt]: Sequelize.literal('NOW() + INTERVAL 48 HOUR') },
                        [Op.or]: [{ last_sent_at: null }, { last_sent_at: { [Op.lt]: Sequelize.literal('NOW() - INTERVAL 24 HOUR') } }],
                    },
                ],
            },
        });
    }
}
