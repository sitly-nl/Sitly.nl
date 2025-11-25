import { optionalAwait, Util } from '../utils/util';
import { DateUtil } from '../utils/date-util';
import { ElasticQuery, ElasticSearchBuilder } from './elastic-search-builder';
import { ElasticService, ElasticUser, ElasticSearchResponse, ElasticHits } from '../services/elastic.service';
import { ScoringOptions, SearchAvailability } from './relevance-sorting/relevance-scoring-options';
import { ElasticParsers } from './elastic-parser';
import { BrandCode } from '../models/brand-code';
import { PagingOptions } from '../../definitions.base';
import { getModels } from '../sequelize-connections';
import { CustomUserRelations } from '../models/user/custom-user.model';
import { User, WebRoleId, WebRoleName } from '../models/user/user.model';
import { sub } from 'date-fns';

interface UsersGroup {
    cellId: string;
    id: string;
    count: number;
    latitude: number;
    longitude: number;
}

export interface LatLng {
    latitude: number;
    longitude: number;
}
export interface Bounds {
    north: number;
    east: number;
    south: number;
    west: number;
}

interface UserSearchOptions {
    include?: (keyof CustomUserRelations)[];
    log?: boolean;
    explain?: boolean;
    useClustering?: boolean;
    groupDistribution?: number;
}

interface UserSearchOptionsInternal extends UserSearchOptions {
    trackTotalHits?: boolean;
}

export interface SimilarUserSearchOptions extends UserSearchOptions {
    privateOnly?: 0 | 1;
}

export type UserSearchType = 'babysitters' | 'babysit-jobs' | 'childminders' | 'childminder-jobs' | 'all';

export interface FosterLocation {
    receive: boolean;
    visit: boolean;
}

export interface UserSearchParams {
    after_school_days?: string[];
    age?: {
        min?: number;
        max?: number;
    };
    age_group_experience?: unknown;
    age_of_children?: {
        min: number;
        max: number;
    };
    availability?: unknown;
    availability_raw?: Record<string, string>;
    availability_preference?: SearchAvailability;
    availability_preference_raw?: Record<string, string>;
    average_hourly_rate?: string[];
    bounds?: Bounds;
    created_after?: string;
    created_before?: string;
    distance?: number;
    exclude?: number[];
    exclude_users?: unknown[];
    foster_is_premium?: boolean;
    foster_chores?: unknown;
    foster_location?: FosterLocation;
    gender?: string;
    has_references?: unknown;
    include?: unknown;
    include_users?: unknown[];
    include_disabled?: boolean;
    is_available_after_school?: unknown;
    is_available_occasionally?: unknown;
    is_available_regularly?: unknown;
    is_educated?: unknown;
    is_experienced?: unknown;
    is_remote_tutor?: unknown;
    is_smoker?: unknown;
    languages?: { value: string[]; localeCode: string };
    last_login_after?: string;
    last_search_activity_after?: string;
    limit?: number;
    looking_for?: WebRoleName;
    looking_for_after_school?: unknown;
    looking_for_occasional_care?: unknown;
    looking_for_regular_care?: unknown;
    looking_for_remote_tutor?: unknown;
    max_number_of_children?: unknown;
    max_babysit_children?: unknown;
    native_language?: { value: string; localeCode: string };
    page?: PagingOptions;
    place?: string;
    place_id?: number;
    private_only?: 0 | 1;
    role?: WebRoleName;
    roles?: WebRoleName[];
    show_sitly_accounts?: boolean;
    scoring_options?: ScoringOptions;
    sort?: string | string[];
    type?: UserSearchType;
    years_of_experience?: unknown;

    custom?: ElasticQuery;
}

export class UserSearchElastic {
    maxLimit = 2000;
    set center(value: LatLng) {
        this.elasticParsers.center = value;
    }

    elasticService = ElasticService.getSearchInstance(this.brandCode);
    private elasticParsers: ElasticParsers;

    constructor(
        private brandCode: BrandCode,
        private localeId: number,
        center?: LatLng,
    ) {
        this.elasticParsers = new ElasticParsers(center);
    }

    private parseParams(eqb: ElasticSearchBuilder, params: UserSearchParams) {
        if (params.bounds) {
            delete params.distance;
        }

        // availability for searching parents
        const occasionalCare = params.looking_for_occasional_care;
        delete params.looking_for_occasional_care;
        const regularCare = params.looking_for_regular_care;
        delete params.looking_for_regular_care;
        if (occasionalCare || regularCare) {
            const availability = params.availability_preference;
            delete params.availability_preference;
            if (occasionalCare && regularCare) {
                // no filters applied
            } else if (occasionalCare) {
                this.elasticParsers.looking_for_occasional_care(eqb, true);
            } else if (regularCare) {
                this.elasticParsers.looking_for_regular_care(eqb, true);
                if (availability) {
                    this.elasticParsers.availability_preference(eqb, availability);
                }
            }
        }

        if (Util.isTruthy(params.is_available_occasionally) && Util.isTruthy(params.is_available_regularly)) {
            delete params.is_available_occasionally;
            delete params.is_available_regularly;
        }

        Util.entries(params).forEach(([name, value]) => {
            if (name === 'native_language') {
                const val = value as (typeof params)['native_language'];
                if (!val) {
                    return;
                }
                this.elasticParsers[name]?.(eqb, val.value, val.localeCode);
            } else if (name === 'languages') {
                const val = value as (typeof params)['languages'];
                if (!val) {
                    return;
                }
                this.elasticParsers[name]?.(eqb, val.value, val.localeCode);
            } else {
                this.elasticParsers[name]?.(eqb, value as never);
            }
        });
    }

    async getTotals() {
        const eqb = new ElasticSearchBuilder(this.elasticService.indexName, true);
        eqb.limit(0);
        eqb.trackTotalHits();
        eqb.aggs({
            role: {
                terms: {
                    field: 'webrole_id',
                },
                aggs: {
                    'childminder-jobs': {
                        terms: {
                            field: 'pref_childminder',
                        },
                    },
                    'babysitter-jobs': {
                        terms: {
                            field: 'pref_babysitter',
                        },
                    },
                },
            },
        });

        const searchOptions = eqb.toJSON();
        const searchResults = await this.elasticService.client.search<ElasticSearchResponse<ElasticUser>>(searchOptions);
        return searchResults.body.aggregations?.role.buckets;
    }

    async getSimilar(user: User, options: SimilarUserSearchOptions) {
        const params: UserSearchParams = {
            page: {
                number: 1,
                size: 5,
            },
            role: user.roleName,
            last_login_after: sub(new Date(), { months: 1 }).toISOString(),
        };

        let availabilityOptions:
            | {
                  name: 'availability_preference_raw' | 'availability_raw';
                  prefix: 'pref' | 'foster';
              }
            | undefined;
        switch (user.webrole_id) {
            case WebRoleId.parent:
                availabilityOptions = {
                    name: 'availability_preference_raw',
                    prefix: 'pref',
                };
                params.sort = ['avatar', 'distance'];
                break;
            case WebRoleId.babysitter: {
                let locationOptions;
                const { map_latitude: latitude, map_longitude: longitude } = user.customUser;
                if (latitude && longitude) {
                    locationOptions = {
                        center: { latitude, longitude },
                        maxDistance: 5,
                    };
                }

                params.scoring_options = new ScoringOptions(true, locationOptions, user.availability);
                params.gender = 'f';
                const age = user.age;
                if (age > 0) {
                    params.age = { min: age - 4, max: age + 4 };
                }
                break;
            }
            case WebRoleId.childminder: {
                availabilityOptions = {
                    name: 'availability_raw',
                    prefix: 'foster',
                };

                params.gender = 'f';
                const age = user.age;
                if (age > 0) {
                    params.age = { min: age - 5, max: age + 5 };
                }
                params.sort = ['avatar', 'distance'];
                break;
            }
        }

        if (availabilityOptions) {
            for (const weekDay of DateUtil.weekDays) {
                const availabilityValue = params[availabilityOptions.name] ?? {};
                const userAvailabilityDay = user.customUser[`${availabilityOptions.prefix}_${weekDay}`];
                if (userAvailabilityDay) {
                    availabilityValue[weekDay] = userAvailabilityDay;
                }
                params[availabilityOptions.name] = availabilityValue;
            }
        }
        const { map_latitude, map_longitude } = user.customUser;
        if (map_latitude && map_longitude) {
            this.center = {
                latitude: map_latitude,
                longitude: map_longitude,
            };
        }
        params.exclude = [user.webuser_id];

        if (options.privateOnly !== undefined) {
            params.private_only = options.privateOnly;
            delete options.privateOnly;
        }
        const userCollection = await this.users(params, options);
        if (userCollection.models.length === 0) {
            delete params.place_id;

            params.distance = 10;
            if (params.age?.min) {
                params.age.min = params.age.min - 10;
            }

            if (params.age?.max) {
                params.age.max = params.age.max + 10;
            }
            return this.users(params, options);
        } else {
            return userCollection;
        }
    }

    async getElasticUsers(
        paramsInput: UserSearchParams,
        options: UserSearchOptionsInternal,
        customConfigurator?: (eqb: ElasticSearchBuilder) => void,
    ) {
        const params = { ...paramsInput };
        if (!params.custom) {
            params.show_sitly_accounts = params.show_sitly_accounts ?? false;
        }

        if (typeof params.sort === 'string') {
            params.sort = params.sort.split(',').map((item: string) => {
                return item.trim();
            });
        }

        if (params.place) {
            const place = await getModels(this.brandCode).Place.byPlaceUrl(params.place, false, this.localeId);
            if (place) {
                delete params.place;
                params.place_id = place.canonical_place_id ?? place.instance_id;
            }
        }
        const index = this.elasticService.indexName;

        const eqb = new ElasticSearchBuilder(index, params.include_disabled);
        delete params.include_disabled;
        if (customConfigurator) {
            customConfigurator(eqb);
        }
        this.parseParams(eqb, params);

        const searchOptions = eqb.toJSON();
        searchOptions.explain = !!options.explain;
        if (options.trackTotalHits) {
            searchOptions.track_total_hits = true;
        }

        const devToolsSearchOptions = {
            track_total_hits: true,
            query: searchOptions.body?.query,
            sort: searchOptions.body?.sort,
            size: searchOptions.size,
            from: searchOptions.from,
        };
        if (options.log) {
            console.log(`GET ${index}/_search\n`, JSON.stringify(devToolsSearchOptions), '\n\ndevToolsSearchOptions');
        }

        try {
            const searchResult = await this.elasticService.client.search<ElasticSearchResponse<ElasticUser>>({
                ...searchOptions,
                _source: ['webuser_id', 'map_point'],
            });
            return searchResult.body;
        } catch (e) {
            console.log(`Error for: GET ${index}/_search\n`, JSON.stringify(devToolsSearchOptions, null, 2), '\ndevToolsSearchOptions');
            throw e;
        }
    }

    async usersCount(params: UserSearchParams) {
        const searchResult = await this.getElasticUsers(params, { trackTotalHits: true });
        return searchResult.hits.total.value;
    }

    async hourlyRateStatistic(params: UserSearchParams) {
        const searchResult = await this.getElasticUsers(params, {}, (eqb: ElasticSearchBuilder) => {
            eqb.aggs({
                rates: {
                    terms: {
                        field: 'avg_hourly_rate.keyword',
                    },
                },
            });
        });
        return searchResult.aggregations?.rates.buckets ?? [];
    }

    async getUsersMainWithElasticResults(params: UserSearchParams, options: UserSearchOptionsInternal = {}) {
        const searchResult = await this.getElasticUsers(params, options);
        const users = searchResult.hits.hits;
        const total = searchResult.hits.total.value;
        if (options.useClustering && params.bounds && total > 100) {
            const groups = this.groupElastic(searchResult.hits, params.bounds, options.groupDistribution);
            return { users: groups, results: searchResult };
        } else {
            const startTime = Date.now();
            const webuserIds = users.map(user => +user._id);
            webuserIds.push(-1); // to make sure there aren't any syntax errors in the SQL

            const usersDB = await getModels(this.brandCode).User.byIds(webuserIds, options.include, {
                inappropriate: 0,
                completed: 1,
                ...(params.include_disabled ? {} : { disabled: 0 }),
            });
            const result = {
                models: usersDB,
                ...(params.page
                    ? {
                          pagination: {
                              page: +params.page.number,
                              pageCount: total ? Math.ceil(total / +params.page.size) : 0,
                              pageSize: +params.page.size,
                              rowCount: total,
                          },
                      }
                    : {}),
            };
            const endTime = Date.now();
            if (options.log) {
                console.log('mysql query: ', endTime - startTime);
            }

            const mysqlWebuserIds = result.models.map(model => model.webuser_id);
            for (const user of users) {
                const webuserId = +user._id;
                if (!mysqlWebuserIds.includes(webuserId) && webuserId !== -1) {
                    await optionalAwait(this.elasticService.deleteUsers([webuserId], true));
                }
            }
            return {
                users: result,
                results: searchResult,
            };
        }
    }

    async users(params: UserSearchParams, options: UserSearchOptions = {}) {
        return (await this.getUsersMainWithElasticResults(params, options)).users as { models: User[] };
    }

    private groupElastic(hits: ElasticHits<ElasticUser>, bounds: Bounds, groupDistribution?: number) {
        const users = hits.hits;
        const cells: UsersGroup[] = [];

        const gridRows = groupDistribution ?? (users.length > 800 ? 15 : 5);
        // width and height of a cell
        const width = Util.round((bounds.east - bounds.west) / gridRows, 4);
        const height = Util.round((bounds.north - bounds.south) / gridRows, 4);

        for (const user of users) {
            const lat = user._source.map_point?.lat ?? 0;
            const lng = user._source.map_point?.lon ?? 0;

            const cellX = Math.ceil((lng - bounds.west) / width);
            const cellY = Math.ceil((bounds.north - lat) / height);

            const cellId = `${cellX};${cellY}`;

            const cell = cells.find(cell => cell.cellId === cellId);
            if (!cell) {
                cells.push({
                    cellId,
                    id: cellId,
                    count: 1,
                    latitude: lat,
                    longitude: lng,
                });
            } else {
                const count = cell.count;
                // re-center the cell
                cell.latitude = (cell.latitude * count + lat) / (count + 1);
                cell.longitude = (cell.longitude * count + lng) / (count + 1);
                cell.count++;
            }
        }
        return cells;
    }
}
