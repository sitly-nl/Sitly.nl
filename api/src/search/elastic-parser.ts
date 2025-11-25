import { DateUtil } from '../utils/date-util';
import { Language } from '../Language';
import { Util } from '../utils/util';
import { ElasticQuery, ElasticSearchBuilder } from './elastic-search-builder';
import { ScoringOptions, SearchAvailability } from './relevance-sorting/relevance-scoring-options';
import { Bounds, LatLng, UserSearchType } from './user-search-elastic';
import { ElasticUser } from '../services/elastic.service';
import { PagingOptions } from '../../definitions.base';
import { WebRoleId, WebRoleName } from '../models/user/user.model';
import { sub } from 'date-fns';

/* eslint-disable @typescript-eslint/naming-convention */
export class ElasticParsers {
    constructor(public center?: LatLng) {}

    include_disabled(_eqb: ElasticSearchBuilder, _paramValue: boolean) {
        // handled in ElasticSearchBuilder constructor
    }

    page(eqb: ElasticSearchBuilder, paramValue: PagingOptions) {
        eqb.setPage(paramValue);
    }

    type(eqb: ElasticSearchBuilder, paramValue: UserSearchType) {
        switch (paramValue) {
            case 'babysitters':
                this.role(eqb, WebRoleName.babysitter);
                eqb.where('has_avatar_warnings', 0);
                eqb.where('gender', 'f');
                break;
            case 'babysit-jobs':
                this.role(eqb, WebRoleName.parent);
                eqb.where('pref_babysitter', 1);
                break;
            case 'childminders':
                this.role(eqb, WebRoleName.childminder);
                eqb.where('has_avatar_warnings', 0);
                eqb.where('gender', 'f');
                break;
            case 'childminder-jobs':
                this.role(eqb, WebRoleName.parent);
                eqb.where('pref_childminder', 1);
                break;
            case 'all':
                break;
            default:
                paramValue satisfies never;
                throw new Error(`Invalid param value ${paramValue}`);
        }
    }

    place_id(eqb: ElasticSearchBuilder, paramValue: number) {
        eqb.where('place_id', paramValue);
    }

    place(eqb: ElasticSearchBuilder, paramValue: string) {
        eqb.where('place_url.keyword', paramValue);
    }

    limit(eqb: ElasticSearchBuilder, paramValue: number) {
        eqb.limit(paramValue);
    }

    sort(eqb: ElasticSearchBuilder, paramValue: string[]) {
        const sortOptions = paramValue;
        const index = sortOptions.findIndex(item => item.startsWith('created-after'));
        if (index >= 0) {
            const sort = sortOptions[index];
            const parts = sort.split('created-after:');
            const createdAfter = parts.at(-1) ?? '';
            eqb.sort('_script', {
                type: 'number',
                script: {
                    lang: 'painless',
                    source: "if (doc['created'].value.toInstant().toEpochMilli() > params.millis) { return 2 } else { return 1 }",
                    params: {
                        millis: new Date(createdAfter).getTime(),
                    },
                },
                order: 'desc',
            });

            sortOptions.splice(index, 1);
        }

        for (const sort of sortOptions) {
            if (sort === 'avatar') {
                eqb.sort('has_avatar', 'desc');
            } else if (sort === 'random') {
                eqb.sort('_doc', 'desc');
            } else if (sort === 'about') {
                eqb.sort('has_large_about_text', 'desc');
            } else if (sort === 'created') {
                eqb.sort('created', 'desc');
            } else if (sort === 'recent-activity') {
                eqb.sort('last_login', 'desc');
            } else if (sort.startsWith('age-')) {
                // give priority to users with in a certain age range, for example age-24-50
                const [minAge, maxAge] = sort.split('-').splice(1);
                if (!Number.isNaN(minAge) && !Number.isNaN(maxAge)) {
                    const currentYear = new Date().getFullYear();
                    eqb.sort('_script', {
                        type: 'number',
                        script: {
                            lang: 'painless',
                            source: `
                            if(doc.birthdate.size() != 0) {
                                int approximateAge = ${currentYear} - doc.birthdate.value.year;
                                return approximateAge > ${minAge} && approximateAge < ${maxAge} ? 1 : 0;
                            }
                            `.trim(),
                        },
                        order: 'desc',
                    });
                }
            } else if (sort === 'recommendations') {
                if (sortOptions.includes('recent-activity')) {
                    eqb.sort('_script', {
                        type: 'number',
                        script: {
                            lang: 'painless',
                            source: `
                            new Date().getTime() - (doc.last_login.size() == 1 ? doc.last_login.value.getMillis() : 0) 
                            > (1000 * 60 * 60 * 24 * 14) ? 
                            0 : (doc['average_recommendation_score'].size() == 1 ? doc['average_recommendation_score'].value : 0)
                            `,
                        },
                        order: 'desc',
                    });
                } else {
                    eqb.sort('average_recommendation_score', 'desc');
                    eqb.sort('number_of_recommendations', 'desc');
                }
                eqb.range(
                    'average_recommendation_score',
                    {
                        lt: 4,
                    },
                    'exclude',
                );
            } else if (sort === 'distance') {
                const lat = this?.center?.latitude;
                const lon = this?.center?.longitude;
                if (!lat || !lon) {
                    throw new Error('Center must be set on user-search to use distance');
                }

                eqb.sort('_geo_distance', {
                    map_point: { lat, lon },
                    order: 'asc',
                    unit: 'km',
                    distance_type: 'plane',
                });
            } else if (sort === 'relevance') {
                eqb.sort('_score', 'desc');
            }
        }
    }

    looking_for(eqb: ElasticSearchBuilder, paramValue: WebRoleName) {
        switch (paramValue) {
            case WebRoleName.babysitter:
                eqb.where('pref_babysitter', 1);
                break;
            case WebRoleName.childminder:
                eqb.where('pref_childminder', 1);
                break;
            case WebRoleName.parent:
                // babysitters and childminder don't need a role preference for parent
                break;
            default:
                paramValue satisfies never;
                throw new Error(`Invalid param value ${paramValue}`);
        }
    }

    role(eqb: ElasticSearchBuilder, paramValue: WebRoleName) {
        const roleId = WebRoleId[paramValue];
        if (roleId) {
            if (roleId === WebRoleId.parent) {
                eqb.pushToBoolMustNot({
                    bool: {
                        must: [
                            {
                                range: {
                                    premium: {
                                        gt: 'now',
                                    },
                                },
                            },
                            {
                                range: {
                                    last_search_activity: {
                                        lt: 'now-8d',
                                    },
                                },
                            },
                        ],
                    },
                });
            }
            eqb.where('webrole_id', roleId);
        } else {
            throw new Error(`Invalid param value ${paramValue}`);
        }
    }

    roles(eqb: ElasticSearchBuilder, paramValue: WebRoleName[]) {
        const ids = paramValue.map(item => WebRoleId[item]).filter(item => item);
        eqb.whereIn('webrole_id', ids);
    }

    bounds(eqb: ElasticSearchBuilder, bounds: Bounds) {
        eqb.filter('geo_bounding_box', {
            map_point: {
                top_left: {
                    lat: bounds.north,
                    lon: bounds.west,
                },
                bottom_right: {
                    lat: bounds.south,
                    lon: bounds.east,
                },
            },
        });
    }

    distance(eqb: ElasticSearchBuilder, paramValue: number) {
        const lat = this?.center?.latitude;
        const lon = this?.center?.longitude;
        if (!lat || !lon) {
            throw new Error('Center must be set on user-search to use distance');
        }
        eqb.filter('geo_distance', {
            distance: `${paramValue}km`,
            map_point: { lat, lon },
        });
    }

    availability(eqb: ElasticSearchBuilder, paramValue: SearchAvailability) {
        ElasticParsers.format_availability(eqb, paramValue, 'foster');
    }

    availability_preference(eqb: ElasticSearchBuilder, paramValue: SearchAvailability) {
        ElasticParsers.format_availability(eqb, paramValue, 'pref', 'should');
    }

    availability_raw(eqb: ElasticSearchBuilder, paramValue: Record<string, string>) {
        ElasticParsers.format_availability_raw(eqb, paramValue, 'foster');
    }

    availability_preference_raw(eqb: ElasticSearchBuilder, paramValue: Record<string, string>) {
        ElasticParsers.format_availability_raw(eqb, paramValue, 'pref', 'should');
    }

    is_available_after_school(eqb: ElasticSearchBuilder, paramValue: unknown) {
        eqb.where('foster_after_school', Util.boolyToInt(paramValue));
    }

    is_available_occasionally(eqb: ElasticSearchBuilder, paramValue: unknown) {
        eqb.where('foster_occasional', Util.boolyToInt(paramValue));
    }

    is_available_regularly(eqb: ElasticSearchBuilder, paramValue: unknown) {
        eqb.where('foster_regular', Util.boolyToInt(paramValue));
    }

    is_remote_tutor(eqb: ElasticSearchBuilder, paramValue: unknown) {
        eqb.where('foster_remote_tutor', Util.boolyToInt(paramValue));
    }

    looking_for_remote_tutor(eqb: ElasticSearchBuilder, paramValue: unknown) {
        eqb.where('pref_remote_tutor', Util.boolyToInt(paramValue));
    }

    looking_for_after_school(eqb: ElasticSearchBuilder, paramValue: unknown) {
        eqb.where('pref_after_school', Util.boolyToInt(paramValue));
    }

    looking_for_regular_care(eqb: ElasticSearchBuilder, paramValue: unknown) {
        eqb.where('pref_regular', Util.boolyToInt(paramValue));
    }

    looking_for_occasional_care(eqb: ElasticSearchBuilder, paramValue: unknown) {
        eqb.where('pref_occasional', Util.boolyToInt(paramValue));
    }

    is_educated(eqb: ElasticSearchBuilder, paramValue: unknown) {
        eqb.where('foster_educated', Util.boolyToInt(paramValue));
    }

    is_experienced(eqb: ElasticSearchBuilder, paramValue: unknown) {
        eqb.where('foster_experienced', Util.boolyToInt(paramValue));
    }

    has_references(eqb: ElasticSearchBuilder, paramValue: unknown) {
        eqb.where('foster_references', Util.boolyToInt(paramValue));
    }

    is_smoker(eqb: ElasticSearchBuilder, _paramValue: unknown) {
        eqb.whereNot('smoke', 1);
    }

    native_language(eqb: ElasticSearchBuilder, paramValue: string, localeCode: string) {
        const requestLanguage = localeCode.split('_').shift();

        let langs;
        if (['en', 'nl'].indexOf(requestLanguage ?? '') >= 0) {
            langs = [Language.getLanguageByLanguageCode(paramValue, 'en'), Language.getLanguageByLanguageCode(paramValue, 'nl')];
        } else {
            langs = [Language.getLanguageByLanguageCode(paramValue, requestLanguage)];
        }
        const allLangs = [];
        for (const lang of langs) {
            allLangs.push(lang.localName);
            allLangs.push(lang.name);
        }

        eqb.match('mother_language', allLangs.map(lang => lang?.toLowerCase()).join(' '), 'OR');
    }

    languages(eqb: ElasticSearchBuilder, paramValue: string[], localeCode: string) {
        const requestLanguage = localeCode.split('_').shift() ?? '';

        let langs;
        if (['en', 'nl'].indexOf(requestLanguage) >= 0) {
            // legacy language format in database
            const englishLegacyLangs = Language.getLanguagesByLanguageCodes(paramValue, 'en');
            const dutchLegacyLangs = Language.getLanguagesByLanguageCodes(paramValue, 'nl');
            langs = englishLegacyLangs.map(lang => {
                lang.dutchName = dutchLegacyLangs.find(dutchLegacyLang => dutchLegacyLang.code === lang.code)?.name;
                return lang;
            });
        } else {
            langs = Language.getLanguagesByLanguageCodes(paramValue, requestLanguage);
        }

        for (const lang of langs) {
            const whereLang = [];
            whereLang.push(lang.localName);
            whereLang.push(lang.name);
            if (lang.dutchName) {
                whereLang.push(lang.dutchName);
            }

            eqb.match('languages', whereLang.join(' '), 'OR');
        }
    }

    average_hourly_rate(eqb: ElasticSearchBuilder, paramValue: unknown) {
        eqb.filter('terms', { 'avg_hourly_rate.keyword': paramValue });
    }

    max_number_of_children(eqb: ElasticSearchBuilder, paramValue: string | number) {
        eqb.range('children_count', {
            lte: paramValue,
        });
    }

    max_babysit_children(eqb: ElasticSearchBuilder, paramValue: string | number) {
        eqb.range('max_babysit_children', {
            gte: paramValue,
        });
    }

    years_of_experience(eqb: ElasticSearchBuilder, paramValue: string | number) {
        eqb.range('years_experience', {
            gte: paramValue,
        });
    }

    age_of_children(eqb: ElasticSearchBuilder, paramValue: { min?: number; max?: number }) {
        eqb.range('children_count', {
            gte: 1,
        });

        const range = { lte: `now-${paramValue.min ?? 0}y` } as { lte: string; gte?: string };
        if (paramValue.max) {
            range.gte = `now-${Number(paramValue.max) + 1}y`;
        }
        eqb.range('children_min_birthdate', range);
        eqb.range('children_max_birthdate', range);
    }

    foster_chores(eqb: ElasticSearchBuilder, paramValue: object) {
        Object.entries(paramValue).forEach(([choreName, selected]) => {
            eqb.where(`foster_${choreName}` as keyof ElasticUser, Util.boolyToInt(selected));
        });
    }

    age_group_experience(eqb: ElasticSearchBuilder, paramValue: object) {
        Object.entries(paramValue).forEach(([groupName, selected]) => {
            if (Util.boolyToInt(selected)) {
                eqb.whereContains('type_experience.keyword', `${groupName}`);
            }
        });
    }

    age(eqb: ElasticSearchBuilder, paramValue: { min?: number; max?: number }) {
        if (paramValue.min || paramValue.max) {
            const birthdateFilter: Record<string, string> = {};
            if (paramValue.min) {
                birthdateFilter.lte = `now-${+paramValue.min}y`;
            }
            if (paramValue.max) {
                birthdateFilter.gte = `now-${+paramValue.max + 1}y`; // +1 because you are the same age for a year
            }
            eqb.range('birthdate', birthdateFilter);
        }
    }

    gender(eqb: ElasticSearchBuilder, paramValue: string) {
        const mappings: Record<string, string> = {
            male: 'm',
            female: 'f',
        };

        paramValue = mappings[paramValue] || paramValue;

        eqb.where('gender', paramValue);
    }

    foster_location(eqb: ElasticSearchBuilder, paramValue: { visit: unknown; receive: unknown }) {
        const visit = Util.boolyToInt(paramValue.visit);
        const receive = Util.boolyToInt(paramValue.receive);
        if (visit) {
            eqb.where('foster_visit', Util.boolyToInt(visit));
        }

        if (receive) {
            eqb.where('foster_receive', Util.boolyToInt(receive));
        }
    }

    last_login_after(eqb: ElasticSearchBuilder, paramValue: string) {
        eqb.range('last_login', {
            gte: DateUtil.isTimeUnit(paramValue) ? DateUtil.timeUnitToIsoDate(paramValue) : paramValue,
        });
    }

    last_search_activity_after(eqb: ElasticSearchBuilder, paramValue: string) {
        eqb.range('last_search_activity', {
            gte: paramValue,
        });
    }

    private_only(eqb: ElasticSearchBuilder, paramValue: number) {
        eqb.where('private_only', paramValue);
    }

    exclude(eqb: ElasticSearchBuilder, paramValue: unknown[]) {
        const isArray = paramValue instanceof Array;
        if (!isArray) {
            paramValue = [paramValue];
        }
        if (paramValue.length > 0) {
            eqb.whereNotIn('_id', paramValue);
        }
    }

    exclude_users(eqb: ElasticSearchBuilder, paramValue: string[]) {
        eqb.whereNotIn('webuser_url', paramValue);
    }

    include(eqb: ElasticSearchBuilder, paramValue: unknown) {
        eqb.whereIn('_id', paramValue instanceof Array ? paramValue : [paramValue]);
    }

    include_users(eqb: ElasticSearchBuilder, paramValue: string[]) {
        eqb.whereIn('webuser_url', paramValue);
    }

    created_before(eqb: ElasticSearchBuilder, paramValue: string | number) {
        eqb.range('created', {
            lt: paramValue,
        });
    }

    created_after(eqb: ElasticSearchBuilder, paramValue: string | number) {
        eqb.range('created', {
            gte: paramValue,
        });
    }

    after_school_days(eqb: ElasticSearchBuilder, paramValue: string[]) {
        for (const weekDay of paramValue) {
            eqb.whereContains(`foster_${weekDay}`, '2');
        }
        eqb.where('foster_after_school', Util.boolyToInt(true));
    }

    foster_is_premium(eqb: ElasticSearchBuilder, paramValue: boolean) {
        eqb.range('premium', { gte: sub(new Date(), { days: 1 }).toISOString() }, paramValue ? 'include' : 'exclude');
    }

    scoring_options(eqb: ElasticSearchBuilder, paramValue: ScoringOptions) {
        eqb.setScoringOptions(paramValue);
    }

    show_sitly_accounts(eqb: ElasticSearchBuilder, paramValue: boolean) {
        if (!paramValue) {
            eqb.whereNot('is_sitly_account', 1);
        }
    }

    custom(eqb: ElasticSearchBuilder, paramValue: ElasticQuery) {
        eqb.custom(paramValue);
    }

    private static format_availability(
        eqb: ElasticSearchBuilder,
        paramValue: SearchAvailability,
        prefix: string,
        searchType: 'must' | 'should' = 'must',
    ) {
        const dayPartMappings: Record<string, string> = {
            morning: '1',
            afternoon: '2',
            evening: '3',
        };
        for (const weekDay of Util.keysOf(paramValue)) {
            const weekDayValues = [];
            for (const dayPart of Util.keysOf(paramValue[weekDay] ?? {})) {
                const dayPartValue = paramValue[weekDay]?.[dayPart];
                if (dayPartValue) {
                    weekDayValues.push(dayPartMappings[dayPart]);
                }
            }
            weekDayValues.forEach(weekDayValue => {
                eqb.whereContains(`${prefix}_${weekDay}`, `${weekDayValue}`, searchType);
            });
        }
    }

    private static format_availability_raw(
        eqb: ElasticSearchBuilder,
        paramValue: Record<string, string>,
        prefix: string,
        searchType: 'must' | 'should' = 'must',
    ) {
        for (const weekDay of Object.keys(paramValue)) {
            eqb.whereContains(`${prefix}_${weekDay}.keyword`, `${paramValue[weekDay]}`, searchType);
        }
    }
}
