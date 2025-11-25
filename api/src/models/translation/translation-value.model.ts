import { Op } from 'sequelize';
import { BelongsTo, Column, DataType, ForeignKey, Table, CreatedAt, Sequelize, UpdatedAt } from 'sequelize-typescript';
import { FetchPageInfo } from '../../routes/fetch-page-info';
import { TranslationEnvironment } from '../../routes/gem/translations/translations';
import { TranslationBaseModel } from '../base.model';
import { LocaleId } from '../locale.model';
import { TranslationCode } from './translation-code.model';
import { getTranslationModels } from '../../sequelize-connections';
import { Environment } from '../../services/env-settings.service';

// schema driven by Sequelize
class TranslationValueColumns extends TranslationBaseModel<
    TranslationValueColumns,
    'translation_value_id',
    'country_id' | 'created_at' | 'updated_at'
> {
    @Column({ primaryKey: true, autoIncrement: true }) translation_value_id: number;

    @Column({ allowNull: false, unique: 'code-locale-country-unique' })
    @ForeignKey(() => TranslationCode)
    translation_code_id: number;

    @CreatedAt created_at: Date;
    @UpdatedAt updated_at: Date;

    @Column({ type: DataType.TEXT, allowNull: false }) value_development: string;
    @Column(DataType.TEXT) value_acceptance: string | null;
    @Column(DataType.TEXT) value_production: string | null;
    @Column({ type: DataType.INTEGER, allowNull: false, unique: 'code-locale-country-unique' }) locale_id: LocaleId;
    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0, unique: 'code-locale-country-unique' }) country_id: number | null;
}

@Table({ tableName: 'translation_values' })
export class TranslationValue extends TranslationValueColumns {
    @BelongsTo(() => TranslationCode) code: TranslationCode;

    private static defaultIncludes = {
        association: 'code',
        required: true,
        include: [
            {
                association: 'group',
                required: true,
            },
        ],
    };

    get value() {
        return Environment.isProd ? this.value_production : this.value_development;
    }

    static getGroupValues({
        groupName,
        localeId,
        countryId = 0,
        prefixes,
    }: {
        groupName: string | string[];
        localeId: number;
        countryId?: number;
        prefixes?: string[];
    }) {
        return this.findAll({
            where: [
                {
                    'locale_id': localeId,
                    'country_id': countryId,
                    '$code->group.group_name$': groupName,
                    ...(prefixes
                        ? {
                              [Op.or]: prefixes.map(prefix => {
                                  return { '$code.translation_code$': { [Op.startsWith]: prefix } };
                              }),
                          }
                        : {}),
                },
            ],
            include: TranslationValue.defaultIncludes,
        });
    }

    static async find({
        localeIds,
        groupId,
        countryId,
        keyword,
        untranslated,
        page,
    }: {
        localeIds: number[];
        groupId?: string;
        countryId?: string;
        keyword?: string;
        untranslated?: boolean;
        page?: FetchPageInfo;
    }) {
        const res = await getTranslationModels().TranslationCode.findAndCountAll({
            where: [
                groupId ? { translation_group_id: groupId } : {},
                countryId
                    ? {
                          [Op.or]: localeIds.map((_, index) => {
                              return { [`$values${index === 1 ? 'Extra' : ''}.country_id$`]: countryId };
                          }),
                      }
                    : {},
                keyword
                    ? {
                          [Op.or]: [
                              ...localeIds.map((_, index) => {
                                  return { [`$values${index === 1 ? 'Extra' : ''}.value_development$`]: { [Op.substring]: keyword } };
                              }),
                              { translation_code_id: keyword },
                              { translation_code: { [Op.substring]: keyword } },
                              { '$group.group_name$': { [Op.substring]: keyword } },
                          ],
                      }
                    : {},
                untranslated
                    ? {
                          [Op.or]: [{ '$valuesExtra.value_development$': { [Op.like]: '' } }, { '$valuesExtra.value_development$': null }],
                      }
                    : {},
            ],
            include: [
                ...localeIds.map((item, index) => {
                    return {
                        association: `values${index === 1 ? 'Extra' : ''}`,
                        required: false,
                        where: {
                            locale_id: item,
                        },
                    };
                }),
                {
                    association: 'group',
                    required: true,
                },
            ],
            order: [['translation_code_id', 'DESC']],
            limit: page?.limit ?? 100,
            offset: page?.offset ?? 0,
            subQuery: false,
        });
        return {
            count: res?.count,
            rows: res?.rows.flatMap(item => {
                const res = (item.values ?? []).concat(item.valuesExtra ?? []);
                res.forEach(value => (value.code = item));
                return res;
            }),
        };
    }

    static findWithDifferentValues({
        source,
        target,
        localeIds,
        keyword,
        page,
    }: {
        source: TranslationEnvironment;
        target: TranslationEnvironment;
        localeIds?: number[];
        keyword?: string;
        page?: FetchPageInfo;
    }) {
        return this.findAndCountAll({
            where: [
                Sequelize.where(
                    Sequelize.fn('BINARY', Sequelize.fn('IFNULL', Sequelize.col(`value_${source}`), '')),
                    Op.ne,
                    Sequelize.fn('IFNULL', Sequelize.col(`value_${target}`), ''),
                ),
                localeIds ? { locale_id: localeIds } : {},
                keyword
                    ? {
                          [Op.or]: [
                              { translation_code_id: keyword },
                              { [`value_${source}`]: { [Op.substring]: keyword } },
                              { [`value_${target}`]: { [Op.substring]: keyword } },
                              { '$code.translation_code$': { [Op.substring]: keyword } },
                              { '$code->group.group_name$': { [Op.substring]: keyword } },
                          ],
                      }
                    : {},
            ],
            order: [
                ['translation_code_id', 'DESC'],
                ['translation_value_id', 'DESC'],
            ],
            limit: page?.limit ?? 100,
            offset: page?.offset ?? 0,
            include: TranslationValue.defaultIncludes,
        });
    }
}
