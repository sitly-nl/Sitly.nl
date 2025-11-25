import { BelongsTo, Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { CountryBaseModel } from './base.model';
import { CustomUser } from './user/custom-user.model';
import { Op, WhereOptions } from 'sequelize';
import { CryptoUtil } from '../utils/crypto-util';
import { Environment } from '../../src/services/env-settings.service';
import { User } from './user/user.model';

export enum RecommendationStatus {
    requested = 'requested',
    published = 'published',
}

export class RecommendationColumns extends CountryBaseModel<RecommendationColumns, 'instance_id', 'recommendation_status' | 'created_at'> {
    @Column({ primaryKey: true, autoIncrement: true }) instance_id: number;

    @Column({ allowNull: false })
    @ForeignKey(() => CustomUser)
    webuser_id: number;

    @Column(DataType.INTEGER) author_id: number | null;
    @Column(DataType.STRING) description: string | null;
    @Column(DataType.TINYINT) score: number | null;
    @Column author_name: string;
    @Column({ type: DataType.ENUM(...Object.values(RecommendationStatus)), defaultValue: RecommendationStatus.requested })
    recommendation_status: RecommendationStatus;

    @Column({ defaultValue: DataType.NOW }) created_at: Date;
    @Column(DataType.DATE) published_at: Date | null;

    @Column(DataType.STRING) token_id: string | null;
}

@Table({ tableName: 'custom_module_recommendations' })
export class Recommendation extends RecommendationColumns {
    @BelongsTo(() => User, { foreignKey: 'webuser_id' }) user?: User;

    static recommendationsCount(userId: number, authorId: number) {
        return this.count({
            where: {
                webuser_id: userId,
                author_id: authorId,
            },
        });
    }

    static countForUsers(userId1: number, userId2: number) {
        return this.count({
            where: {
                [Op.or]: [
                    { webuser_id: userId1, author_id: userId2 },
                    { webuser_id: userId2, author_id: userId1 },
                ],
            },
        });
    }

    encryptedRecommendationId() {
        return CryptoUtil.encryptIv(`${this.instance_id}`, Environment.jwtSecret.toString());
    }

    static async byEncryptedRecommendationId(
        encryptedRecommendationId: string,
        extraWhere: WhereOptions<Recommendation> = {},
        includeUser = false,
    ) {
        const instanceId = parseInt(CryptoUtil.decryptIv(encryptedRecommendationId, Environment.jwtSecret.toString()) ?? '', 10);
        if (Number.isNaN(instanceId)) {
            return null;
        }
        return this.findOne({
            where: {
                instance_id: instanceId,
                ...extraWhere,
            },
            ...(includeUser
                ? {
                      include: {
                          association: 'user',
                          include: ['customUser'],
                      },
                  }
                : {}),
        });
    }

    static async deleteByUserId(userId: number) {
        return this.destroy({
            where: {
                webuser_id: userId,
            },
        });
    }
}
