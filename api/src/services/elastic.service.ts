import { EventEmitter } from 'events';
import { Client } from '@elastic/elasticsearch';
import { LogService } from './log.service';
import { BrandCode } from '../models/brand-code';
import { DateUtil } from '../utils/date-util';
import { Environment } from './env-settings.service';
import { optionalAwait, Util } from '../utils/util';
import { NestedAggsResults } from '../routes/statistics';
import { getKnex } from '../knex';
import { WebRoleId, WebRoleName } from '../models/user/user.model';
import { startOfDay } from 'date-fns';
import { Op, QueryTypes, Sequelize } from 'sequelize';
import { getModels } from '../sequelize-connections';

const searchServices = new Map<BrandCode, ElasticService>();
const logServices = new Map<BrandCode, ElasticService>();

export interface ElasticGetResponse<T> {
    _id: string;
    _source: T;
    _score: number;
    _explanation: {
        value: number;
        details: {
            details: {
                value: string;
                details: {
                    value: string;
                    description: string;
                }[];
            }[];
        }[];
    };
}

export interface ElasticHits<T> {
    total: {
        value: number;
        relation: string;
    };
    max_score: number;
    hits: ElasticGetResponse<T>[];
}

export interface ElasticSearchResponse<T> {
    hits: ElasticHits<T>;
    aggregations?: Record<string, { buckets: NestedAggsResults[] }>;
}
export interface ElasticUser {
    average_recommendation_score: number;
    children_count: number;
    max_babysit_children: number;
    messages_received_last_month: number;
    place_id: number;
    received_invites_count_last_day?: number;
    webuser_id: number;
    webrole_id: number;
    place_url: string;
    webuser_url: string;
    birthdate: string;
    children_max_birthdate: string;
    children_min_birthdate: string;
    created: string;
    last_login: string;
    last_search_activity: string;
    premium: string;
    email: string;
    gender: 'm' | 'f';
    map_point?: {
        coordinates?: number[];
        lat?: number;
        lon?: number;
    };
    active: 0 | 1;
    completed: 0 | 1;
    disabled: 0 | 1;
    deleted: 0 | 1;
    foster_after_school: 0 | 1;
    foster_educated: 0 | 1;
    foster_experienced: 0 | 1;
    foster_occasional: 0 | 1;
    foster_receive: 0 | 1;
    foster_regular: 0 | 1;
    foster_references: 0 | 1;
    foster_remote_tutor: 0 | 1;
    foster_visit: 0 | 1;
    pref_after_school: 0 | 1;
    pref_babysitter: 0 | 1;
    pref_childminder: 0 | 1;
    pref_occasional: 0 | 1;
    pref_regular: 0 | 1;
    pref_remote_tutor: 0 | 1;
    has_avatar_warnings: 0 | 1;
    has_avatar: 0 | 1;
    inappropriate: 0 | 1;
    invisible: 0 | 1;
    private_only: 0 | 1;
    years_experience: 0 | 1;
}

export class ElasticService extends EventEmitter {
    private constructor(
        public client: Client,
        public indexName: string,
    ) {
        super();
    }

    static getSearchInstance(brandCode: BrandCode) {
        let service = searchServices.get(brandCode);
        if (!service) {
            const elasticClient = new Client(Environment.apiKeys.elasticsearch_users);
            service = new ElasticService(elasticClient, `${Environment.apiKeys.elasticsearch_index_prefix}-${brandCode}`);
            searchServices.set(brandCode, service);
        }
        return service;
    }

    static getLogInstance(brandCode: BrandCode) {
        let service = logServices.get(brandCode);
        if (!service) {
            const elasticClient = new Client(Environment.apiKeys.elasticsearch_logs);
            service = new ElasticService(elasticClient, `${Environment.apiKeys.elasticsearch_log_index_prefix}-${brandCode}`);
            logServices.set(brandCode, service);
        }
        return service;
    }

    createUserTemplate() {
        this.client.indices.putTemplate({
            name: 'user-mappings',
            body: {
                index_patterns: ['*sitly*'],
                mappings: {
                    users: {
                        properties: {
                            map_point: {
                                type: 'geo_point',
                            },
                            children_min_birthdate: {
                                type: 'date',
                            },
                            children_max_birthdate: {
                                type: 'date',
                            },
                            birthdate: {
                                type: 'date',
                            },
                            created: {
                                type: 'date',
                            },
                            last_login: {
                                type: 'date',
                            },
                            premium: {
                                type: 'date',
                            },
                            initial_premium_date: {
                                type: 'date',
                            },
                            availability_updated: {
                                type: 'date',
                            },
                            last_search_activity: {
                                type: 'date',
                            },
                            average_recommendation_score: {
                                type: 'float',
                            },
                        },
                    },
                },
            },
        });
    }

    async syncUsers(
        brandCode: BrandCode,
        userIds: number[] | 'all' | 'outdated' | 'active' | 'active-last-minute' | 'enabled',
        refresh = false,
    ) {
        const knex = getKnex();
        const models = getModels(brandCode);
        const days = DateUtil.weekDays;

        let query = knex
            .count('w.webuser_id as count')
            .from('cms_webusers as w')
            .join('custom_cms_webusers as cw', 'w.webuser_id', 'cw.webuser_id')
            .join('custom_module_places as p', 'cw.place_id', 'p.instance_id')
            .where({
                'w.active': 1,
                'completed': 1,
            });

        if (userIds instanceof Array) {
            query.whereIn('w.webuser_id', userIds);
        } else if (userIds === 'outdated') {
            query.whereRaw('(cw.last_elastic_sync < NOW() - INTERVAL 3 DAY)');
        } else if (userIds === 'active') {
            query.where('last_login', '>', Math.round(new Date().getTime() / 1000) - 60 * 60 * 24 * 30); // 30 days
            query.whereRaw('disabled = 0');
        } else if (userIds === 'active-last-minute') {
            query.where('last_login', '>', Math.round(new Date().getTime() / 1000) - 100); // 100 seconds (40 second security margin)
            query.whereRaw('disabled = 0');
        } else if (userIds === 'enabled') {
            query.whereRaw('disabled = 0');
        }

        const countSql = query.toSQL();
        const totalCountRes = await models.User.sequelize.query<{ count: number }>(
            { query: countSql.sql, values: countSql.bindings as string[] },
            { type: QueryTypes.SELECT, plain: true },
        );
        const totalCount = totalCountRes?.count ?? 0;

        query.clearSelect();

        query.select([
            'w.webuser_id',
            'w.email',
            'cw.webuser_url',
            'disabled',
            'deleted',
            'w.active',
            'completed',
            'premium',
            'webrole_id',
            'gender',
            'pref_min_age',
            'pref_max_age',
            'inappropriate',
            'invisible',
            ...days.map(day => `foster_${day}`),
            ...days.map(day =>
                // initially not on all platforms parents looking for occasional care was asked about day availability
                // starting from ~1.06.2020 we updated all apps to do so
                // therefore, for parents created before this date we pre-fill day availability
                knex.raw(`IF(pref_regular = 0 AND pref_occasional = 1 AND created < 1590969600, '1,2,3', pref_${day}) AS pref_${day}`),
            ),
            ...days.map(day =>
                knex.raw(
                    `REPLACE(REPLACE(REPLACE(REPLACE(foster_${day}, '1', 'morning'), '2', 'afternoon'), '3', 'evening'), ',', ' ') as foster_${day}_formatted`,
                ),
            ),
            ...days.map(day =>
                knex.raw(
                    `REPLACE(REPLACE(REPLACE(REPLACE(IF(pref_regular = 0 AND pref_occasional = 1, '1,2,3', pref_${day}), '1', 'morning'), '2', 'afternoon'), '3', 'evening'), ',', ' ') as pref_${day}_formatted`,
                ),
            ),
            knex.raw("DATE(DATE_ADD('1970-01-01 00:00:00',INTERVAL birthdate SECOND)) AS birthdate"),
            'pref_babysitter',
            'pref_childminder',
            'pref_occasional',
            'pref_regular',
            'pref_after_school',
            'pref_remote_tutor',
            'place_id',
            'place_name',
            'place_url',
            knex.raw('point(cw.map_latitude, cw.map_longitude) as map_point'),
            'private_only',
            'smoke',
            knex.raw('FROM_UNIXTIME(created) AS created'),
            'foster_after_school',
            'foster_occasional',
            'foster_regular',
            'foster_remote_tutor',
            knex.raw('IF(foster_educated OR CHAR_LENGTH(education)>0, 1, 0) as foster_educated'),
            knex.raw('IF(foster_experienced OR CHAR_LENGTH(type_experience)>0 OR years_experience>0, 1, 0) as foster_experienced'),
            'foster_references', // todo join references table
            'mother_language', // todo insert all possible localities
            'languages', // todo insert all possible  localities
            'years_experience',
            knex.raw("REPLACE(type_experience, '_', '-') as type_experience"),
            knex.raw("REPLACE(avg_hourly_rate, '_', '-') as avg_hourly_rate"),
            knex.raw("IF(max_babysit_children = '4plus', 5, max_babysit_children) as max_babysit_children"),
            'foster_chores',
            'foster_driving',
            'foster_shopping',
            'foster_cooking',
            'foster_homework',
            'foster_visit',
            'foster_receive',
            'average_recommendation_score',
            knex.raw('LENGTH(cw.about) as about_length'),
            knex.raw('IF(LENGTH(cw.about) > 500, 1, 0) as has_large_about_text'),
            knex.raw('!ISNULL(avatar_url) AS has_avatar'),
            knex.raw(`(
                SELECT IF(COUNT(1), 1, 0) FROM custom_module_webuser_warnings 
                WHERE webuser_id = w.webuser_id
                AND warning_type = 'avatar'
                AND warning_level <> 'ignored'
            ) AS has_avatar_warnings`),
            knex.raw('FROM_UNIXTIME(last_login) as last_login'),
            'availability_updated',
            'last_search_activity',
            knex.raw(`(
                SELECT COUNT(1) FROM custom_module_children WHERE webuser_id = w.webuser_id
            ) AS children_count`),
            knex.raw(`(
                SELECT MIN(DATE(FROM_UNIXTIME(birthdate)))
                FROM custom_module_children
                WHERE webuser_id = w.webuser_id AND DATE(FROM_UNIXTIME(birthdate)) > NOW() - INTERVAL 15 YEAR
            ) AS children_min_birthdate`),
            knex.raw(`(
                SELECT MAX(DATE(FROM_UNIXTIME(birthdate)))
                FROM custom_module_children
                WHERE webuser_id = w.webuser_id AND DATE(FROM_UNIXTIME(birthdate)) > NOW() - INTERVAL 15 YEAR
            ) AS children_max_birthdate`),
            knex.raw(`(
                SELECT MAX(DATE(FROM_UNIXTIME(created)))
                FROM custom_module_orders
                WHERE webuser_id = w.webuser_id
                AND order_type = 'initial'
            ) AS initial_premium_date`),
            knex.raw(`(
                SELECT COUNT(1)
                FROM custom_module_recommendations
                WHERE webuser_id = w.webuser_id
            ) AS number_of_recommendations`),
            knex.raw("IF(w.email like '%@sitly.com', 1, 0) as is_sitly_account"),
        ]);

        query.orderBy('webuser_id', 'DESC');

        const pageSize = 500;
        let pageCount = 1;
        pageCount = Math.ceil(totalCount / pageSize);
        query.limit(pageSize);
        this.emit('sync_start', pageCount);
        for (let i = 0; i < pageCount; i++) {
            const bulk: Record<string, unknown>[] = [];

            query = query.clone();
            if (userIds !== 'outdated') {
                query.offset(i * pageSize);
            }

            const sqlStr = query.toQuery().replace(/^select/, 'select SQL_NO_CACHE');
            const users = await getModels(brandCode).User.sequelize.query<ElasticUser>(sqlStr, { type: QueryTypes.SELECT });
            if (!users.length) {
                continue;
            }

            const deletedUsers: ElasticUser[] = [];
            users.forEach(user => {
                const id = user.webuser_id;
                if (user.deleted === 1) {
                    bulk.push({
                        delete: {
                            _index: this.indexName,
                            _id: id,
                        },
                    });
                    deletedUsers.push(user);
                } else {
                    bulk.push({
                        update: {
                            _index: this.indexName,
                            _id: id,
                            retry_on_conflict: 2,
                        },
                    });

                    if (user.map_point?.coordinates) {
                        user.map_point = {
                            lat: user.map_point.coordinates[0],
                            lon: user.map_point.coordinates[1],
                        };
                    } else {
                        delete user.map_point;
                    }
                    bulk.push({ doc_as_upsert: true, doc: user });
                }
            });

            await optionalAwait(
                Promise.all(deletedUsers.map(item => LogService.clearLogsForDeletedUser(item.webuser_id, item.email, brandCode))),
            );

            const result = await this.client.bulk({
                refresh,
                body: bulk,
            });
            this.emit('sync_page', result);
            if (result.body.errors) {
                throw new Error(JSON.stringify(result.body.items, null, 2));
            }

            if (pageCount > 1) {
                await Util.wait(200);
            }
        }
    }

    async syncMessages(brandCode: BrandCode, usersToUpdate: 'messages-updated' | 'messages-outdated', refresh = false) {
        const models = getModels(brandCode);
        const knex = getKnex();
        const query = knex.from('cms_webusers as w').join('custom_cms_webusers as cw', 'w.webuser_id', 'cw.webuser_id').where({
            'w.active': 1,
            'completed': 1,
        });

        if (usersToUpdate === 'messages-outdated') {
            const qb = knex('custom_module_messages')
                .select(['receiver_id'])
                .whereRaw(`created > UNIX_TIMESTAMP(CURDATE() - INTERVAL 31 DAY)`)
                .where({ is_initial: 1 })
                .whereRaw(`(message_type = 'regular' OR message_type IS NULL)`)
                .groupBy('receiver_id')
                .having(knex.raw('DATE(FROM_UNIXTIME(MAX(created))) = CURDATE() - INTERVAL 31 DAY'));
            query.whereIn('w.webuser_id', qb);
        } else if (usersToUpdate === 'messages-updated') {
            query.where('elastic_sync', 'messages');
            query.limit(1000);
        }

        query.select([
            'w.webuser_id',
            ...(usersToUpdate === 'messages-outdated'
                ? [knex.raw('0 AS messages_received_last_month')]
                : [
                      knex.raw(`(
                        SELECT COUNT(1)
                        FROM custom_module_messages m 
                        WHERE 
                            m.created > UNIX_TIMESTAMP(CURDATE() - INTERVAL 30 DAY)
                            AND is_initial = 1
                            AND (message_type = 'regular' OR message_type IS NULL)
                            AND m.receiver_id = w.webuser_id
                        ) AS messages_received_last_month`),
                  ]),
        ]);

        this.emit('sync_start', 1);

        const sql = query.toSQL();
        const usersUpdates = await models.User.sequelize.query<{ webuser_id: number; messages_received_last_month: number }>(
            { query: sql.sql, values: sql.bindings as string[] },
            { type: QueryTypes.SELECT },
        );

        const bulk: Record<string, unknown>[] = [];
        usersUpdates.forEach(update => {
            bulk.push({
                update: {
                    _index: this.indexName,
                    _id: update.webuser_id,
                    retry_on_conflict: 2,
                },
            });
            bulk.push({ doc_as_upsert: true, doc: update });
        });

        if (!bulk.length) {
            this.emit('sync_page', []);
            return;
        }

        const result = await this.client.bulk({
            refresh,
            body: bulk,
        });

        const updatedUserIds = usersUpdates.map(user => user.webuser_id).filter(id => !!id);
        const runQuery = () => {
            return models.CustomUser.update(
                {
                    last_elastic_sync: new Date(),
                    elastic_sync: null,
                },
                { where: { webuser_id: updatedUserIds } },
            );
        };
        try {
            await runQuery();
        } catch (e) {
            console.trace((e as Error).message);
            await Util.wait(500);
            try {
                await runQuery();
            } catch {}
        }
        this.emit('sync_page', result);

        return result;
    }

    async syncReceivedInvites(brandCode: BrandCode, refresh = false) {
        const models = getModels(brandCode);
        const updates = (await models.ConnectionInvite.findAll({
            attributes: ['receiver_id', [Sequelize.fn('count', Sequelize.col('connection_invite_id')), 'count']],
            where: {
                created_at: { [Op.gte]: startOfDay(new Date()) },
            },
            having: Sequelize.where(
                Sequelize.fn('MAX', Sequelize.col('created_at')),
                Op.gt,
                Sequelize.fn(
                    // get start of previous minute
                    'DATE_FORMAT',
                    Sequelize.fn('DATE_SUB', Sequelize.literal('NOW()'), Sequelize.literal('INTERVAL 1 MINUTE')),
                    '%Y-%m-%d %H:%i:00',
                ),
            ),
            group: ['receiver_id'],
            raw: true,
        })) as unknown as { receiver_id: number; count: number }[];
        if (updates.length === 0) {
            return;
        }

        const body = updates
            .map(update => [
                {
                    update: {
                        _index: this.indexName,
                        _id: update.receiver_id,
                        retry_on_conflict: 2,
                    },
                },
                {
                    doc_as_upsert: true,
                    doc: {
                        webuser_id: update.receiver_id,
                        received_invites_count_last_day: update.count,
                    },
                },
            ])
            .flat();
        await this.client.bulk({ body, refresh });
    }

    async resetReceivedInvites(refresh = false) {
        return this.client.updateByQuery(
            {
                index: this.indexName,
                body: {
                    script: {
                        source: 'ctx._source.received_invites_count_last_day = 0',
                        lang: 'painless',
                    },
                    query: {
                        range: {
                            received_invites_count_last_day: {
                                gte: 0,
                            },
                        },
                    },
                },
                conflicts: 'proceed',
                refresh,
                timeout: '5m',
                slices: 'auto',
            },
            { maxRetries: 2 },
        );
    }

    async getUser(userId: number, refresh = false) {
        const result = await this.client.get<ElasticGetResponse<ElasticUser>>({
            index: this.indexName,
            type: '_doc',
            id: userId.toString(),
            refresh,
        });
        return result.body;
    }

    async deleteUsers(userIds: number[], refresh = false) {
        return Promise.all(
            userIds.map(userId =>
                this.client
                    .delete({
                        index: this.indexName,
                        type: '_doc',
                        id: userId.toString(),
                        refresh,
                    })
                    .catch(_ => {}),
            ),
        );
    }

    async countUsers(latitude: number, longitude: number, radius: number) {
        const countResult = await this.client.search<ElasticSearchResponse<ElasticUser>>({
            index: this.indexName,
            filter_path: 'aggregations',
            body: {
                query: {
                    bool: {
                        filter: [
                            {
                                term: {
                                    disabled: 0,
                                },
                            },
                            {
                                term: {
                                    completed: 1,
                                },
                            },
                            {
                                geo_distance: {
                                    distance: `${radius}km`,
                                    map_point: {
                                        lat: latitude,
                                        lon: longitude,
                                    },
                                },
                            },
                        ],
                    },
                },
                aggs: {
                    user_roles: {
                        terms: { field: 'webrole_id' },
                    },
                },
            },
        });

        const roleCounts = {
            parent: 0,
            babysitter: 0,
            childminder: 0,
        };

        return (
            countResult.body.aggregations?.user_roles.buckets.reduce((acc, agg) => {
                const roleName = WebRoleId[agg.key];
                const roleCount = agg.doc_count;
                acc[roleName as WebRoleName] = roleCount;
                return acc;
            }, roleCounts) ?? roleCounts
        );
    }

    async refresh() {
        return await this.client.indices.refresh({
            index: this.indexName,
        });
    }
}
