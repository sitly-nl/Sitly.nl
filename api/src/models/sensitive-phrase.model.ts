import { AfterSave, Column, DataType, Table } from 'sequelize-typescript';
import { CountryBaseModel } from './base.model';
import { CacheItem, CacheService } from '../services/cache.service';
import { UserWarningLevel } from '../types';
import { FetchPageInfo } from '../routes/fetch-page-info';
import { Op } from 'sequelize';

export class SensitivePhraseColumns extends CountryBaseModel<SensitivePhraseColumns, 'instance_id', 'active'> {
    @Column({ primaryKey: true, autoIncrement: true }) instance_id: number;
    @Column({ allowNull: false, defaultValue: 1 }) active: 0 | 1;
    @Column({
        allowNull: false,
        type: DataType.ENUM(...Object.values(UserWarningLevel)),
        defaultValue: UserWarningLevel.moderate,
    })
    type: UserWarningLevel;
    @Column phrase: string;
}

@Table({ tableName: 'custom_module_sensitive_phrases' })
export class SensitivePhrase extends SensitivePhraseColumns {
    @AfterSave
    static async clearCache() {
        const cache = await CacheService.getInstance(
            CacheItem.sensitivePhrase({
                database: this.sequelize.config.database,
                key: 'all',
            }),
        );
        await cache.delete();
        await this.sequelize.models.SensitivePhraseExclusion.clearCache();
    }

    static async byPhrase(phrase: string) {
        return this.findOne({ where: { phrase } });
    }

    static async all() {
        return this.findAll({ where: { active: 1 } });
    }

    static async byIds(ids: number[]) {
        return this.findAll({ where: { instance_id: ids } });
    }

    static async find({
        page,
        filter,
        orderBy,
    }: {
        page?: FetchPageInfo;
        filter?: { phrase: string; types: UserWarningLevel[] };
        orderBy?: string;
    }) {
        const orderComponents = orderBy?.split(' ');
        return this.findAndCountAll({
            where: {
                active: 1,
                ...(filter?.phrase ? { phrase: { [Op.substring]: filter.phrase } } : {}),
                ...(filter?.types ? { type: filter.types } : {}),
            },
            order: [[orderComponents?.[0] ?? 'phrase', orderComponents?.[1] ?? 'ASC']],
            limit: page?.limit ?? 100,
            offset: page?.offset ?? 0,
        });
    }
}
