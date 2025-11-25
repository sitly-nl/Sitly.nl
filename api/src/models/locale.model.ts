import { Column, DataType, Table } from 'sequelize-typescript';
import { BaseModel } from './base.model';
import { Op } from 'sequelize';
import { BrandCode } from './brand-code';

/* eslint-disable @typescript-eslint/naming-convention */
export enum LocaleId {
    'nl_NL' = 1,
    'en_GB' = 2,
    'de_DE' = 3,
    'it_IT' = 4,
    'pl_PL' = 5,
    'es_ES' = 6,
    'nb_NO' = 7,
    'fi_FI' = 8,
    'da_DK' = 9,
    'tr_TR' = 10,
    'es_MX' = 11,
    'es_AR' = 12,
    'sv_SE' = 13,
    'nl_BE' = 14,
    'fr_FR' = 15,
    'pt_BR' = 16,
    'es_CO' = 17,
    'ms_MY' = 18,
    'ko_KO' = 19,
    'fr_CA' = 20,
}
/* eslint-enable @typescript-eslint/naming-convention */

// TODO: - move it out of model
const caches = new Map<BrandCode, Partial<Record<LocaleId, Locale | null>>>();
const cachesAll = new Map<BrandCode, Locale[]>();
//

export class LocaleColumns extends BaseModel<LocaleColumns, 'locale_id'> {
    @Column({ primaryKey: true, autoIncrement: true, type: DataType.INTEGER }) locale_id: LocaleId;
    @Column({ allowNull: false }) locale_code: string;
    @Column({ allowNull: false }) locale_name: string;
    @Column({ allowNull: false }) active: number;
}

@Table({ tableName: 'cms_locales' })
export class Locale extends LocaleColumns {
    private static getCache() {
        const brandCode = (this.sequelize as unknown as { brandCode___: BrandCode }).brandCode___;
        let cache = caches.get(brandCode);
        if (!cache) {
            cache = {};
            caches.set(brandCode, cache);
        }
        return cache;
    }

    static async byId(localeId: LocaleId) {
        const cache = this.getCache();
        if (cache[localeId]) {
            return cache[localeId] ?? null;
        }
        return this.findOne({
            where: {
                locale_id: localeId,
                active: 1,
            },
        }).then(result => {
            cache[localeId] = result;
            return result;
        });
    }

    static async byLanguageCode(languageCode: string) {
        return this.findOne({
            where: {
                active: 1,
                locale_code: { [Op.startsWith]: languageCode },
            },
        });
    }

    static async all() {
        const brandCode = (this.sequelize as unknown as { brandCode___: BrandCode }).brandCode___;
        const cache = cachesAll.get(brandCode);
        if (cache) {
            return cache;
        }

        return this.findAll({
            where: { active: 1 },
        }).then(result => {
            cachesAll.set(brandCode, result);
            return result;
        });
    }

    static async supportedLocales() {
        const locales = await this.all();
        const supported: Record<string, LocaleId> = {};
        locales.forEach(element => {
            supported[element?.locale_code] = element?.locale_id;
        });
        return supported;
    }
}
