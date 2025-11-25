import { SitlyRouter } from '../sitly-router';
import { Request, Response } from 'express';
import { Serializer as JSONAPISerializer } from 'jsonapi-serializer';
import { UsersRoute } from './users';
import { Bounds, FosterLocation, LatLng, UserSearchElastic as UserSearch, UserSearchParams } from '../../search/user-search-elastic';
import { SearchAvailability, ScoringOptions, RelevanceScoringWeights } from '../../search/relevance-sorting/relevance-scoring-options';
import { sanitizeSearch } from '../../search/search-sanitization';
import { serializeUser, UserSerializerMeta } from './user.serializer';
import { optionalAwait, Util } from '../../utils/util';
import { GeocodeService } from '../../services/geocode/geocode.service';
import { DateUtil } from '../../utils/date-util';
import { brandCodeToCountryCode } from '../../models/brand-code';
import { StringUtil } from '../../utils/string-util';
import { SearchParseError } from '../../search/search-parse-error';
import { UrlUtil } from '../../utils/url-util';
import { mapKeys } from 'lodash';
import { notFoundError, unprocessableEntityError } from '../../services/errors';
import {
    type fostersRelevanceScoringFunctions,
    type parentsRelevanceScoringFunctions,
} from '../../search/relevance-sorting/relevance-scoring-functions';
import { ElasticGetResponse, ElasticSearchResponse, ElasticUser } from '../../services/elastic.service';
import { User, WebRoleName } from '../../models/user/user.model';
import { getModels } from '../../sequelize-connections';
import { OptionalUserRequest } from '../../services/auth.service';
import { UserCustomSetters } from './user-custom-setters';
import { isBefore, sub } from 'date-fns';
import { Environment } from '../../services/env-settings.service';

export interface UserSearchParamsInput extends UserSearchParams {
    'include-elastic-result'?: boolean;
    'include-inactive': unknown;
    'includeDisabled': boolean;
    'includeInactive'?: unknown;
    'group': unknown;
    'groupDistribution': number;
    'log'?: boolean;
    'lookingFor'?: string;
    'meta-only'?: string;
    'relevanceSortingWeights'?: RelevanceScoringWeights;
    'zoom'?: number;
    'filter': {
        'active-after': string;
        'age': {
            min?: number;
            max?: number;
        };
        'ageGroupExperience': unknown[];
        'availability'?: SearchAvailability;
        'availabilityPreference'?: SearchAvailability;
        'averageHourlyRate'?: string[];
        'afterSchoolDays'?: string[];
        'ageOfChildren': {
            min: number;
            max: number;
        };
        'bounds'?: Bounds;
        'center'?: LatLng;
        'created-before': string;
        'distance'?: number;
        'exclude-users'?: unknown[];
        'fosterChores'?: unknown;
        'fosterLocation'?: FosterLocation;
        'gender'?: string;
        'hasReferences': unknown;
        'include': unknown[];
        'include-users'?: unknown[];
        'isAvailableAfterSchool': unknown;
        'isAvailableOccasionally': unknown;
        'isAvailableRegularly': unknown;
        'isEducated': unknown;
        'isExperienced': unknown;
        'isRemoteTutor': unknown;
        'isSmoker': unknown;
        'keyword': unknown;
        'languages': string[];
        'lookingForAfterSchool': unknown;
        'lookingForOccasionalCare': unknown;
        'lookingForRegularCare': unknown;
        'lookingForRemoteTutor': unknown;
        'minAge'?: number;
        'maxAge'?: number;
        'maxBabysitChildren'?: unknown;
        'maxNumberOfChildren'?: unknown;
        'nativeLanguage'?: string;
        'place': string;
        'postal-code': unknown;
        'postal-code-margin'?: number;
        'role'?: WebRoleName;
        'yearsOfExperience'?: unknown;
    };
}

const createClusterSerializer = () => {
    return new JSONAPISerializer('userGroups', {
        attributes: ['count', 'latitude', 'longitude'],
        meta: {},
    });
};

type SearchType =
    | {
          type: 'forGemUser';
          user: User;
          center: LatLng;
          relevanceSortingWeights: RelevanceScoringWeights;
      }
    | {
          type: 'forUser';
          user: User;
          center: LatLng;
      }
    | {
          type: 'generic';
          user?: undefined;
      };

const metaOnlyCache: Record<string, { cacheTime: number; response: unknown }> = {};

export class UsersSearchRoute extends UsersRoute {
    static create(router: SitlyRouter) {
        router.get<OptionalUserRequest>('/users', (req, res) => {
            return new UsersSearchRoute().search(req, res);
        });
    }

    // eslint-disable-next-line complexity
    async search(req: OptionalUserRequest | Request, res: Response) {
        const query = req.query as unknown as UserSearchParamsInput;
        let searchType: SearchType;
        const models = getModels(req.brandCode);
        if (req.gemUser) {
            const user = await models.User.byId(parseInt(req.params.userId, 10));
            if (!user) {
                return notFoundError({ res, title: 'User not found' });
            }

            const { map_latitude: latitude, map_longitude: longitude } = user.customUser;
            if (!latitude || !longitude) {
                return unprocessableEntityError({
                    res,
                    title: 'User coordinates are required',
                    code: 'REQUIRED',
                    source: {
                        parameter: 'coordinates',
                    },
                });
            }

            searchType = {
                type: 'forGemUser',
                user,
                center: { latitude, longitude },
                relevanceSortingWeights: Object.entries(query.relevanceSortingWeights ?? {}).reduce(
                    (acc, curr) => {
                        acc[curr[0]] = +curr[1];
                        return acc;
                    },
                    {} as Record<string, number>,
                ),
            };
        } else if ('user' in req && req.user) {
            const { map_latitude: latitude, map_longitude: longitude } = req.user.customUser;
            if (!latitude || !longitude) {
                return unprocessableEntityError({
                    res,
                    title: 'User coordinates are required',
                    code: 'REQUIRED',
                    source: {
                        parameter: 'coordinates',
                    },
                });
            }
            searchType = {
                type: 'forUser',
                user: req.user,
                center: { latitude, longitude },
            };
        } else {
            searchType = {
                type: 'generic',
            };
        }

        sanitizeSearch(req, searchType.user);
        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }

        const metaOnly = query['meta-only'] === '1';
        if (metaOnly) {
            const cached = metaOnlyCache[req.originalUrl];
            const expiryTime = 3 * 60 * 60 * 1000; // 3 hours
            if (cached?.cacheTime > new Date().getTime() - expiryTime) {
                return res.json(cached.response);
            }
        }

        try {
            const searchParams = await this.searchParams(req, query, searchType);
            if (!searchParams) {
                const response = await serializeUser({
                    data: [],
                    contextUser: undefined,
                    localeCode: req.locale,
                    metaInfo: { meta: { totalCount: 0 }, links: {} },
                });
                return res.json(response);
            }

            const userSearch = new UserSearch(req.brandCode, req.localeId);
            if (searchType.type === 'forGemUser' || searchType.type === 'forUser') {
                userSearch.center = query.filter?.center ?? searchType.center;
            }

            if (metaOnly) {
                const totalCount = await userSearch.usersCount(searchParams);
                const response = { meta: { totalCount } };
                metaOnlyCache[req.originalUrl] = {
                    cacheTime: new Date().getTime(),
                    response,
                };
                return res.json(response);
            } else {
                const includes = this.getIncludes(req, this.userPublicAllowedIncludes);
                if (query.sort?.includes('relevance') && searchType.type === 'forGemUser') {
                    includes.push('parentSearchPreferences');
                }

                const includeElasticResult = query['include-elastic-result'];
                const searchResults = await userSearch.getUsersMainWithElasticResults(searchParams, {
                    include: includes,
                    log: query.log,
                    explain: includeElasticResult || searchType.type === 'forGemUser',
                    useClustering: !!query.group,
                    groupDistribution: query.groupDistribution,
                    trackTotalHits: searchType.type === 'generic',
                });

                const usersResponse = searchResults.users;
                if (Array.isArray(usersResponse)) {
                    const clusterSerializer = createClusterSerializer();
                    const totalCount = usersResponse.reduce((accumulator, currentValue) => accumulator + currentValue.count, 0);
                    clusterSerializer.opts.meta.totalCount = totalCount;
                    return res.json(clusterSerializer.serialize(usersResponse));
                }

                await optionalAwait(this.updateUserSearchIfNecessary(query, searchType, searchResults.results));

                const filter = query.filter;
                const availabilityFilter = filter?.availability;
                const availabilityPreferenceFilter = filter?.availabilityPreference;

                let placeLatLng: LatLng | undefined;
                if (searchType.type === 'generic' && filter?.place) {
                    const place = await models.Place.byPlaceUrl(filter.place, false, req.localeId);
                    if (place?.map_latitude && place?.map_longitude) {
                        placeLatLng = {
                            latitude: place.map_latitude,
                            longitude: place.map_longitude,
                        };
                    }
                }

                const metaInfo: UserSerializerMeta = {
                    meta: {
                        totalCount: usersResponse.pagination?.rowCount,
                        ...(includeElasticResult ? { elasticResult: searchResults.results } : {}),
                    },
                    links: {},
                };

                if (query.page && usersResponse.pagination) {
                    const currentPage = usersResponse.pagination.page;
                    const lastPage = usersResponse.pagination.pageCount;
                    metaInfo.meta.totalPages = lastPage;

                    const customParams = {
                        filter: {
                            ...(filter ?? {}),
                            ...(filter?.['created-before'] ? {} : { 'created-before': new Date().toISOString() }),
                        },
                    };
                    try {
                        metaInfo.links = UrlUtil.createPaginationUrls(req, currentPage, lastPage, customParams);
                    } catch (e) {
                        console.log('e', JSON.stringify(e, null, 2));
                    }
                }

                const response = await serializeUser({
                    data: usersResponse.models,
                    contextUser: searchType.user,
                    localeCode: req.locale,
                    includes,
                    metaInfo,
                    serializationType: searchType.type === 'forGemUser' ? 'internal.base' : undefined,
                    customSetter: (user, userResponse) => {
                        if (placeLatLng) {
                            userResponse.distance = user.getDistance(placeLatLng.latitude, placeLatLng.longitude);
                        }

                        if (searchType.type === 'forGemUser') {
                            const item = searchResults.results.hits.hits.find(item => item._id === `${user.webuser_id}`);
                            if (item) {
                                userResponse.relevanceSortingStats = this.relevanceSortingStats(
                                    item,
                                    searchType.relevanceSortingWeights,
                                    !searchType.user.isParent,
                                );
                            }
                        }
                    },
                });

                if ('user' in req && req.user) {
                    await this.updateUserAfterSearch(
                        req.user,
                        searchParams,
                        req.user.isParent ? availabilityFilter : availabilityPreferenceFilter,
                    );
                }
                res.json(response);
            }
        } catch (err) {
            const error = err as SearchParseError;
            if (error.name === 'SearchParseError') {
                return unprocessableEntityError({ res, title: '', source: { parameter: encodeURIComponent(error.message) } });
            } else {
                this.serverError(req, res, err as Error);
            }
        }
    }

    private async updateUserSearchIfNecessary(
        query: UserSearchParamsInput,
        searchType: SearchType,
        elasticSearchResults: ElasticSearchResponse<ElasticUser>,
    ) {
        if (
            query.sort?.includes('relevance') &&
            (query.page?.number ?? '1') === '1' &&
            searchType.type === 'forUser' &&
            searchType.user.isParent &&
            searchType.user.customUser.quarantined_at === null &&
            (searchType.user.customUser.last_search_activity === null ||
                isBefore(searchType.user.customUser.last_search_activity, sub(new Date(), { days: 30 }))) &&
            elasticSearchResults.hits.hits.length > 0
        ) {
            const models = searchType.user.sequelize.models;
            const previousSearch = await models.UserSearch.findOne({
                where: { webuser_id: searchType.user.webuser_id },
            });
            if (!previousSearch?.search_time || isBefore(previousSearch.search_time, sub(new Date(), { days: 30 }))) {
                await previousSearch?.destroy();

                const search = await models.UserSearch.create({
                    webuser_id: searchType.user.webuser_id,
                });
                console.log('hits=', elasticSearchResults.hits.hits);
                await models.UserSearchResult.bulkCreate(
                    elasticSearchResults.hits.hits.slice(0, 20).map((hit, index) => ({
                        search_id: search.search_id,
                        webuser_id: hit._source.webuser_id,
                        search_score: hit._score,
                        rank: index + 1,
                    })),
                );
            }
        }
    }

    // eslint-disable-next-line complexity
    private async searchParams(req: OptionalUserRequest | Request, query: UserSearchParamsInput, searchType: SearchType) {
        const metaOnly = query['meta-only'] === '1';
        const filter = query.filter;
        const searchParams: UserSearchParams = {
            after_school_days: filter?.afterSchoolDays,
            age:
                query.filter?.minAge || query.filter?.maxAge
                    ? {
                          min: query.filter.minAge,
                          max: query.filter.maxAge,
                      }
                    : filter?.age,
            age_of_children: filter?.ageOfChildren,
            age_group_experience: filter?.ageGroupExperience,
            availability: filter?.availability,
            availability_preference: filter?.availabilityPreference,
            average_hourly_rate: filter?.averageHourlyRate,
            created_before: filter?.['created-before'],
            bounds: filter?.bounds
                ? {
                      north: +filter.bounds.north,
                      east: +filter.bounds.east,
                      south: +filter.bounds.south,
                      west: +filter.bounds.west,
                  }
                : undefined,
            exclude_users: filter?.['exclude-users'],
            foster_chores: filter?.fosterChores,
            foster_location: filter?.fosterLocation,
            gender: filter?.gender,
            has_references: filter?.hasReferences,
            is_available_after_school: filter?.isAvailableAfterSchool,
            is_available_occasionally: filter?.isAvailableOccasionally,
            is_available_regularly: filter?.isAvailableRegularly,
            is_educated: filter?.isEducated,
            is_experienced: filter?.isExperienced,
            is_remote_tutor: filter?.isRemoteTutor,
            is_smoker: filter?.isSmoker,
            include: filter?.include,
            include_users: filter?.['include-users'],
            languages: filter?.languages ? { value: filter.languages, localeCode: req.locale } : undefined,
            last_login_after: filter?.['active-after'],
            looking_for: 'user' in req ? req.user?.roleName : undefined,
            looking_for_after_school: filter?.lookingForAfterSchool,
            looking_for_occasional_care: filter?.lookingForOccasionalCare,
            looking_for_regular_care: filter?.lookingForRegularCare,
            looking_for_remote_tutor: filter?.lookingForRemoteTutor,
            max_babysit_children: filter?.maxBabysitChildren,
            max_number_of_children: filter?.maxNumberOfChildren,
            native_language: filter?.nativeLanguage ? { value: filter.nativeLanguage, localeCode: req.locale } : undefined,
            place: filter?.place,
            role: filter?.role,
            years_of_experience: filter?.yearsOfExperience,

            include_disabled: metaOnly && (query.includeInactive === '1' || query['include-inactive'] === '1'),
            show_sitly_accounts: Environment.isTest || searchType.user?.email?.endsWith('@sitly.com'),
            page: metaOnly
                ? {
                      number: 1,
                      size: 0,
                  }
                : (query.page ?? {
                      number: 1,
                      size: 5000,
                  }),
            sort: query.sort,
            type: query.type,
        };
        Util.keysOf(searchParams).forEach(key => {
            if (searchParams[key] === undefined) {
                delete searchParams[key];
            }
        });

        const models = getModels(req.brandCode);
        let postalCode = filter?.['postal-code'] as string;
        const keyword = filter?.keyword as string;
        if (keyword) {
            const placeUrl = StringUtil.safeString(keyword);
            const place = await models.Place.byPlaceUrl(placeUrl, false, req.localeId);
            if (place) {
                searchParams.place_id = place.canonical_place_id ?? place.instance_id;
            } else if (!postalCode) {
                postalCode = keyword;
            }
        }

        if (postalCode) {
            const geoService = new GeocodeService(brandCodeToCountryCode(req.brandCode));
            const location = await geoService.getCoordsByPostalCode(postalCode);

            if (!location?.bounds) {
                return undefined;
            }

            searchParams.bounds = {
                north: location.bounds.northeast.lat,
                east: location.bounds.northeast.lng,
                south: location.bounds.southwest.lat,
                west: location.bounds.southwest.lng,
            };

            if (filter?.['postal-code-margin']) {
                searchParams.bounds = geoService.extendBounds(searchParams.bounds, filter['postal-code-margin']);
            }
        }

        if (filter?.role === WebRoleName.parent && searchType.user?.isPremium) {
            const premiumStart = await searchType.user.premiumStartDate();
            if (premiumStart && isBefore(premiumStart, sub(new Date(), { hours: 24 }))) {
                const createdBefore = filter?.['created-before'] ? new Date(filter['created-before']) : new Date();
                searchParams.created_before = sub(createdBefore, { hours: 24 }).toISOString();
            }
        }

        if (searchType.type === 'forGemUser' || searchType.type === 'forUser') {
            searchParams.distance = query.filter?.distance ?? 20;
            const center = query.filter?.center ?? searchType.center;
            searchParams.exclude = await searchType.user.excludedUserIds();

            if (query.sort?.includes('relevance')) {
                let availability;
                if (searchType.user.isParent) {
                    if (filter?.availability) {
                        delete searchParams.availability;
                    }
                    availability = filter?.availability;
                } else {
                    if (filter?.availabilityPreference) {
                        delete searchParams.availability_preference;
                    }
                    availability = filter?.availabilityPreference;
                }
                if (searchType.type === 'forGemUser') {
                    if (!availability) {
                        availability = searchType.user.availability;
                    }
                    searchParams.distance = query.filter?.distance ?? searchType.user.customUser.pref_max_distance ?? 20;
                }

                searchParams.scoring_options = await ScoringOptions.defaultInstance({
                    user: searchType.user,
                    availability,
                    locationOptions: searchParams.bounds ? undefined : { center, maxDistance: searchParams.distance },
                });
                if ('relevanceSortingWeights' in searchType) {
                    searchParams.scoring_options.weights = searchType.relevanceSortingWeights;
                    searchParams.scoring_options.isTest = true;
                }
            }
        } else {
            searchParams.private_only = 0; // only show users with private_only for a loggedIn user
        }

        return searchParams;
    }

    private updateUserAfterSearch(user: User, searchParams: UserSearchParams, availability: SearchAvailability | undefined) {
        const customSetters = new UserCustomSetters();

        if (availability) {
            UserCustomSetters.updateAvailability(user, availability, user.isParent ? 'pref' : 'foster', true);
        }

        if (user.isParent) {
            const afterSchoolCare = searchParams.is_available_after_school;
            const remoteTutor = Util.boolyToInt(searchParams.is_remote_tutor);
            const newAfterSchoolCare = afterSchoolCare ? 1 : 0;
            if (newAfterSchoolCare !== user.customUser?.pref_after_school) {
                user.customUser.set('pref_after_school', newAfterSchoolCare);
            }

            if (searchParams.distance && searchParams.distance !== user.customUser.pref_max_distance) {
                user.customUser.set('pref_max_distance', searchParams.distance);
            }

            if (remoteTutor && remoteTutor !== user.customUser?.pref_remote_tutor) {
                user.customUser.set('pref_remote_tutor', remoteTutor as never);
            }

            const dbGender = {
                male: 'm',
                female: 'f',
                m: 'm',
                f: 'f',
            } as const;
            const gender = searchParams.gender as keyof typeof dbGender;
            if (gender && dbGender[gender]) {
                if (dbGender[gender] !== user.customUser?.pref_gender) {
                    user.customUser.set('pref_gender', dbGender[gender]);
                }
            } else {
                user.customUser.set('pref_gender', null);
            }

            customSetters.languages(user, searchParams.languages?.value ?? []);
        } else {
            const remoteTutor = Util.boolyToInt(searchParams.looking_for_remote_tutor);
            if (remoteTutor && remoteTutor !== user.customUser?.foster_remote_tutor) {
                user.customUser.set('foster_remote_tutor', remoteTutor as never);
            }
        }
        return user.customUser.save();
    }

    static inputToSearchParams(paramsInput: UserSearchParamsInput) {
        const paramsCopy: { filter?: typeof paramsInput.filter } = { ...paramsInput };
        const filter = paramsCopy.filter;
        delete paramsCopy.filter;

        if (filter && (filter.minAge || filter.maxAge)) {
            filter.age = {
                min: filter.minAge,
                max: filter.maxAge,
            };
            delete filter.minAge;
            delete filter.maxAge;
        }

        return mapKeys({ ...paramsCopy, ...filter }, (v, k) => {
            return StringUtil.snakeCase(k);
        }) as UserSearchParams;
    }

    private relevanceSortingStats(
        item: ElasticGetResponse<ElasticUser>,
        relevanceSortingWeights: RelevanceScoringWeights,
        searchParents: boolean,
    ) {
        const mapping: Record<keyof typeof parentsRelevanceScoringFunctions | keyof typeof fostersRelevanceScoringFunctions, string> = {
            distance: 'Function for field map_point:',
            lastSearchActivity: 'match filter: ConstantScore(DocValuesFieldExistsQuery [field=last_search_activity])',
            lastSearchActivityConst: 'match filter: last_search_activity:',
            receivedMessageCount: 'Function for field messages_received_last_month:',
            receivedInvitesCountLastDay: 'Function for field received_invites_count_last_day:',
            babyExperience: searchParents ? 'match filter: children_min_birthdate:' : 'match filter: type_experience:0*',
            availability: '-//-',
            premium: 'match filter: +premium:',
            maxBabysitChildren: 'match filter: children_count:',
            avatar: 'match filter: has_avatar:',
            aboutLength: 'match filter: about_length:',
            neutralRecommendations: 'match filter: -ConstantScore(DocValuesFieldExistsQuery [field=average_recommendation_score])',
            positiveRecommendations: 'match filter: average_recommendation_score:',
            childrenCount: 'match filter: max_babysit_children:',
        };

        const explanation = item._explanation;
        const stats = Util.keysOf(relevanceSortingWeights).reduce(
            (acc, curr) => {
                const item = explanation.details[0].details.find(item => item.details[0].description.includes(mapping[curr]));
                acc[curr] = +(item?.value ?? '');
                return acc;
            },
            {} as Record<string, number>,
        );
        stats.availability = explanation.details[0].details.reduce((acc, curr) => {
            if (DateUtil.dayParts.some(dayPart => curr.details[0].description.includes(dayPart))) {
                acc += +(curr.value ?? '');
            }
            return acc;
        }, 0);
        const totalWeights = Object.values(relevanceSortingWeights).reduce((acc, curr) => {
            acc += curr;
            return acc;
        }, 0);
        return {
            match: (100 * item._score) / totalWeights,
            weights: stats,
        };
    }
}
