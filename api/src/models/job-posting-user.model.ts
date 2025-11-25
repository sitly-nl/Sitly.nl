import { BelongsTo, Column, DataType, ForeignKey, Sequelize, Table } from 'sequelize-typescript';
import { CountryBaseModel } from './base.model';
import { Op } from 'sequelize';
import { User } from './user/user.model';
import { JobPosting } from './job-posting.model';
import { UserResponse } from './serialize/user-response';

export class JobPostingUserColumns extends CountryBaseModel<JobPostingUserColumns, 'webuser_job_postings_id'> {
    @Column({ primaryKey: true, autoIncrement: true }) webuser_job_postings_id: number;

    @Column @ForeignKey(() => User) parent_id: number;
    @Column @ForeignKey(() => User) foster_id: number;
    @Column @ForeignKey(() => JobPosting) job_posting_id: number;

    @Column(DataType.DATE) sent_at: Date;
}

@Table({ tableName: 'custom_cms_webuser_job_postings' })
export class JobPostingUser extends JobPostingUserColumns {
    @BelongsTo(() => User) foster?: User;
    @BelongsTo(() => User) parent?: User;
    @BelongsTo(() => JobPosting) jobPosting?: JobPosting;

    async serializeModel(contextUser: User) {
        const attributes = super.toJSON<JobPostingUserColumns & { foster: UserResponse; parent: UserResponse; jobPosting: JobPosting }>();
        if (this.foster) {
            attributes.foster = await UserResponse.instance(this.foster, {
                type: 'regular.full',
                user: contextUser,
            });
        }
        if (this.parent) {
            attributes.parent = await UserResponse.instance(this.parent, {
                type: 'regular.full',
                user: contextUser,
            });
        }
        return attributes;
    }

    static notified(jobPostingId: number) {
        return this.findAll({
            where: {
                job_posting_id: jobPostingId,
                sent_at: {
                    [Op.gt]: Sequelize.literal('NOW() - INTERVAL 2 MONTH'),
                },
            },
        });
    }

    static byFosterId(fosterId: number, options?: { include: 'parent' }) {
        return this.findAll({
            where: { foster_id: fosterId },
            include: options?.include
                ? [{ association: 'jobPosting' }, { association: 'parent', include: [{ association: 'customUser' }] }]
                : {},
        });
    }

    static byParentId(parentId: number, options?: { include: 'foster' }) {
        return this.findAll({
            where: { parent_id: parentId },
            include: options?.include
                ? [{ association: 'jobPosting' }, { association: 'foster', include: [{ association: 'customUser' }] }]
                : {},
        });
    }

    static byFosterIdForJobPosting(fosterId: number, jobPostingId: number) {
        return this.findOne({
            where: {
                foster_id: fosterId,
                job_posting_id: jobPostingId,
            },
        });
    }
}
