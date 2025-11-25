import { AfterSave, Column, Table } from 'sequelize-typescript';
import { CountryBaseModel } from './base.model';
import { CacheItem, CacheService } from '../services/cache.service';
import { FetchPageInfo } from '../routes/fetch-page-info';
import { Op } from 'sequelize';

export class SensitivePhraseExclusionColumns extends CountryBaseModel<SensitivePhraseExclusionColumns, 'instance_id', 'active'> {
    @Column({ primaryKey: true, autoIncrement: true }) instance_id: number;
    @Column({ allowNull: false, defaultValue: 1 }) active: 0 | 1;
    @Column phrase: string;
}

@Table({ tableName: 'custom_module_sensitive_phrases_exclusions' })
export class SensitivePhraseExclusion extends SensitivePhraseExclusionColumns {
    @AfterSave
    static async clearCache() {
        const cache = await CacheService.getInstance(
            CacheItem.sensitivePhraseExclusion({
                database: this.sequelize.config.database,
                key: 'all',
            }),
        );
        await cache.delete();
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

    static async find({ page, filter, orderBy }: { page?: FetchPageInfo; filter?: { phrase: string }; orderBy?: string }) {
        const orderComponents = orderBy?.split(' ');
        return this.findAndCountAll({
            where: {
                active: 1,
                ...(filter?.phrase ? { phrase: { [Op.substring]: filter.phrase } } : {}),
            },
            order: [[orderComponents?.[0] ?? 'phrase', orderComponents?.[1] ?? 'ASC']],
            limit: page?.limit ?? 100,
            offset: page?.offset ?? 0,
        });
    }
}
