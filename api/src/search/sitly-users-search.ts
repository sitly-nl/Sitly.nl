import { DateUtil } from '../utils/date-util';
import { UserWarningLevel } from '../types';
import { getModels } from '../sequelize-connections';
import { Op, QueryTypes } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { UserWarningType } from '../models/user-warning.model';
import { CustomUser, CustomUserRelations } from '../models/user/custom-user.model';
import { WebRoleName, roleNameToRoleId } from '../models/user/user.model';
import { BrandCode } from '../models/brand-code';
import { getKnex } from '../knex';

export interface SitlyUsersSearchParams {
    email: string;
    firstName: string;
    lastName: string;
    placeUrl: string;
    roles: WebRoleName[];
    paymentPlatforms: string[];
    blocked: boolean;
    quarantined: boolean;
    hidden: boolean;
    male: boolean;
    premium: boolean;
    webuserUrl: string;
    userIds: string[];
    abuse: 0 | 1;
    deleted: 0 | 1;
    completed: 0 | 1;
    personalDataNotIgnored: boolean;
}

interface WarningOptions {
    suspected?: boolean;
    warningLevel?: UserWarningLevel;
    warningType?: UserWarningType;
    role?: WebRoleName;
    includeUsers?: string[];
    limit?: number;
    createdBefore?: string;
}
export class GemSitlyUserSearchDB {
    private maxLimit = 30;

    constructor(private brandCode: BrandCode) {}

    private async searchParams(filter: Partial<SitlyUsersSearchParams>, customUserIncludes: (keyof CustomUserRelations)[]) {
        let placeIds;
        if (filter.placeUrl) {
            const place = await getModels(this.brandCode).Place.byKeyword(filter.placeUrl);
            if (place.length > 0) {
                placeIds = place.map(model => model.canonical_place_id ?? model.instance_id);
            }
        }

        return {
            where: {
                ...(filter.userIds ? { webuser_id: filter.userIds } : {}),
                ...(filter.email ? { email: { [Op.substring]: filter.email } } : {}),
                ...(filter.firstName ? { first_name: { [Op.substring]: filter.firstName } } : {}),
                ...(filter.lastName ? { last_name: { [Op.substring]: filter.lastName } } : {}),
                ...(filter.roles ? { webrole_id: filter.roles.map(roleName => roleNameToRoleId(roleName)) } : {}),
                ...(filter.blocked !== undefined ? { active: filter.blocked ? 0 : 1 } : {}),
            },
            include: {
                association: 'customUser',
                where: {
                    ...(placeIds ? { place_id: placeIds } : {}),
                    ...(filter.quarantined ? { quarantined_at: { [Op.not]: null } } : {}),
                    ...(filter.male ? { gender: 'm' } : {}),
                    ...(filter.personalDataNotIgnored
                        ? {
                              [Op.not]: [
                                  Sequelize.where(
                                      Sequelize.fn('COALESCE', Sequelize.col('notes'), "''"),
                                      Op.like,
                                      '%[personal_data_ignored]%',
                                  ),
                              ],
                          }
                        : {}),
                    ...(filter.premium ? { premium: { [Op.gt]: new Date() } } : {}),
                    ...(filter.webuserUrl ? { webuser_url: filter.webuserUrl } : {}),
                    ...(filter.hidden !== undefined ? { disabled: filter.hidden ? 1 : 0 } : {}),
                    ...(filter.abuse !== undefined ? { abuse: filter.abuse ? 1 : 0 } : {}),
                    ...(filter.deleted !== undefined ? { deleted: filter.deleted ? 1 : 0 } : {}),
                    ...(filter.completed !== undefined ? { completed: filter.completed ? 1 : 0 } : {}),
                },
                include: [
                    ...CustomUser.includes(customUserIncludes),
                    ...(filter.paymentPlatforms
                        ? [
                              {
                                  association: 'allPayments',
                                  where: {
                                      psp: filter.paymentPlatforms,
                                      paid: 1,
                                  },
                              },
                          ]
                        : []),
                ],
            },
        };
    }

    async getUsers(filter: Partial<SitlyUsersSearchParams>) {
        const params = await this.searchParams(filter, ['warnings', 'photos', 'place']);
        return getModels(this.brandCode).User.findAll({
            ...params,
            limit: this.maxLimit,
            order: [['created', 'DESC']],
        });
    }

    async getUsersCount(filter: Partial<SitlyUsersSearchParams>) {
        const params = await this.searchParams(filter, []);
        return getModels(this.brandCode).User.count(params);
    }

    private getUsersWithWarningsQuery(options: WarningOptions) {
        const warningLevel = options.warningLevel;

        const knex = getKnex();
        const qb = knex.queryBuilder();
        qb.select('w.*').as('w_data');
        qb.select('cw.suspected');
        qb.from('cms_webusers AS w');
        qb.select(knex.raw('GROUP_CONCAT(warning_type) AS all_warning_types'));
        qb.select(knex.raw('GROUP_CONCAT(warning_level) AS all_warning_levels'));
        qb.select(knex.raw("IF(GROUP_CONCAT(warning_level) LIKE '%severe%', 'severe', 'moderate') AS warning_level"));
        qb.innerJoin('custom_cms_webusers AS cw', 'w.webuser_id', 'cw.webuser_id');
        qb.innerJoin('custom_module_webuser_warnings AS ww', 'w.webuser_id', 'ww.webuser_id');
        qb.orderBy('created', 'DESC');
        qb.orderBy('ww.created_at');
        qb.groupBy('w.webuser_id');
        if (options.limit) {
            qb.limit(options.limit);
        }

        qb.where('w.active', 1);
        if (options.createdBefore) {
            qb.where('created', '<', DateUtil.isoStringToTimestamp(options.createdBefore));
        }
        if (options.role) {
            qb.where('w.webrole_id', roleNameToRoleId(options.role));
        }
        if (options.suspected !== undefined) {
            qb.where('cw.suspected', options.suspected ? 1 : 0);
        }
        qb.whereNot('ww.warning_level', 'ignored');
        if (options.includeUsers) {
            qb.whereIn('w.webuser_id', options.includeUsers);
        }

        if (warningLevel === UserWarningLevel.blocked) {
            qb.whereRaw('cw.quarantined_at IS NOT NULL');
            if (!options.limit) {
                qb.limit(50);
            }
        } else {
            qb.whereRaw('cw.quarantined_at IS NULL');
            if (warningLevel === UserWarningLevel.severe) {
                qb.where('ww.warning_level', UserWarningLevel.severe);
            } else if (warningLevel) {
                qb.havingRaw('all_warning_levels LIKE ?', `%${warningLevel}%`);
                qb.havingRaw('all_warning_levels NOT LIKE ?', `%${UserWarningLevel.severe}%`);
            }
        }

        if (options.warningType) {
            qb.havingRaw('all_warning_types LIKE ?', `%${options.warningType}%`);
        }

        return qb;
    }

    async getUsersWithWarningsCounts(options: WarningOptions) {
        const subQuery = this.getUsersWithWarningsQuery(options);

        const knex = getKnex();
        const qb = knex
            .queryBuilder()
            .select(knex.raw('COUNT(1) as warning_count'))
            .select(['warning_level', 'suspected'])
            .groupBy(['warning_level', 'suspected'])
            .from(subQuery);

        const sql = qb.toSQL();
        const result = await getModels(this.brandCode).User.sequelize.query<{
            warning_level: UserWarningLevel;
            warning_count: number;
            suspected: 0 | 1;
        }>({ query: sql.sql, values: sql.bindings as string[] }, { type: QueryTypes.SELECT });

        const suspectedUserCount = result.reduce((acc, levelCount) => {
            if (levelCount.suspected) {
                return acc + levelCount.warning_count;
            }
            return acc;
        }, 0);
        return {
            moderateWarningUserCount:
                result.find(levelCount => levelCount.warning_level === UserWarningLevel.moderate && !levelCount.suspected)?.warning_count ??
                0,
            severeWarningUserCount:
                result.find(levelCount => levelCount.warning_level === UserWarningLevel.severe && !levelCount.suspected)?.warning_count ??
                0,
            suspectedUserCount,
        };
    }

    async getUsersWithWarnings(options: WarningOptions) {
        const sql = this.getUsersWithWarningsQuery(options).toSQL();
        const queryOutput = await getModels(this.brandCode).User.sequelize.query<{ webuser_id: number }>(
            { query: sql.sql, values: sql.bindings as string[] },
            { type: QueryTypes.SELECT },
        );

        const userIds = queryOutput.map(user => user.webuser_id);
        if (userIds.length === 0) {
            return [];
        }
        return getModels(this.brandCode).User.findAll({
            where: { webuser_id: userIds },
            include: {
                association: 'customUser',
                include: [
                    ...CustomUser.includes(['photos']),
                    {
                        association: 'warnings',
                        where: {
                            warning_level: {
                                [Op.not]: [UserWarningLevel.ignored],
                            },
                            ...(options.warningType ? { warning_type: options.warningType } : {}),
                        },
                        separate: true,
                        include: ['message', 'photo'],
                    },
                ],
            },
            order: Sequelize.literal(`FIELD(User.webuser_id, ${userIds.join(',')})`),
        });
    }
}
