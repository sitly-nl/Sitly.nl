import { BaseRoute } from '../route';
import { Request, Response } from 'express';
import { PageUrlService } from '../../services/page-url.service';
import { config } from '../../../config/config';
import { UserSearchElastic, UserSearchParams } from '../../search/user-search-elastic';
import { sanitizeCityStatistics } from '../../search/search-sanitization';
import { HourlyRateOptionsInterface } from '../../../config/config-interface';
import { Serializer as JSONAPISerializer } from 'jsonapi-serializer';
import { StringUtil } from '../../utils/string-util';
import { ParsedQs } from 'qs';
import { notFoundError } from '../../services/errors';
import { UserSearchParamsInput, UsersSearchRoute } from './users-search';
import { NestedAggsResults } from '../statistics';
import { Util } from '../../utils/util';
import { CountrySettingsRoute } from '../country-settings';
import { HourlyRate } from '../../models/user/custom-user.model';
import { TranslationsService } from '../../services/translations.service';
import { UserRequest } from '../../services/auth.service';
import { sub } from 'date-fns';
import { getModels } from '../../sequelize-connections';
import { Place } from '../../models/place.model';

export class CityStatisticsRoute extends BaseRoute {
    async cityStatistics(req: Request, res: Response) {
        sanitizeCityStatistics(req);
        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }

        const place = await getModels(req.brandCode).Place.byPlaceUrl(
            StringUtil.safeString((req.query.filter as ParsedQs).place as string),
            false,
            req.localeId,
        );
        if (!place) {
            return notFoundError({ res, title: 'Place not found' });
        }

        try {
            const userSearch = new UserSearchElastic(req.brandCode, req.localeId);

            const params = JSON.parse(JSON.stringify(req.query)) as UserSearchParamsInput;
            delete params.role;
            delete params.show_sitly_accounts;
            const statistic = await userSearch.hourlyRateStatistic(UsersSearchRoute.inputToSearchParams(params));
            const brandConfigSettings = config.getConfig(req.brandCode);
            const currencyFormat = CountrySettingsRoute.localizeMoneyFormat(brandConfigSettings.hourlyRateMoneyFormat, req.localeId);

            let averageHourlyRate = this.getAverageHourlyRate(
                this.elasticStatisticToObject(statistic ?? []),
                brandConfigSettings.hourlyRateOptions,
                currencyFormat,
            );
            if (!averageHourlyRate) {
                const usersSearchParams = this.elasticSearchParameters(params, place);
                const userCollection = await userSearch.users(usersSearchParams);
                averageHourlyRate = this.getAverageHourlyRate(
                    userCollection.models.reduce(
                        (acc, value) => {
                            const hourlyRate = value.customUser.avg_hourly_rate;
                            if (!hourlyRate) {
                                return acc;
                            }
                            acc[hourlyRate] = acc[hourlyRate] ? acc[hourlyRate]++ : 1;
                            return acc;
                        },
                        {} as Record<HourlyRate, number>,
                    ),
                    brandConfigSettings.hourlyRateOptions,
                    currencyFormat,
                );
            }

            const pageUrlService = new PageUrlService(req.brandCode, req.localeId, req.headers.host);
            const babysitUrl = await pageUrlService.getUrlByPageCode('babysit');
            const cityUrl = `${babysitUrl}/${place.place_url}`;
            const response = {
                meta: {
                    totalCount: place.babysit_count,
                } as Record<string, unknown>,
                links: {
                    cityUrl,
                },
            };
            if (averageHourlyRate) {
                response.meta.averageHourlyRateFormatted = averageHourlyRate;
            }

            res.status(200).json(response);
        } catch (error) {
            return this.serverError(req, res, error as Error);
        }
    }

    async cityHourlyRatesStatistics(req: UserRequest, res: Response) {
        try {
            const brandConfigSettings = config.getConfig(req.brandCode);
            const ageGroups = [{ min: 18, max: 24 }, { min: 25, max: 60 }, { min: 61 }];

            const { map_latitude: latitude, map_longitude: longitude } = req.user.customUser;
            const hasCoordinates = latitude && longitude;
            const userSearch = new UserSearchElastic(req.brandCode, req.localeId, hasCoordinates ? { latitude, longitude } : undefined);

            const statistics = await Promise.all(
                ageGroups.map(async item => {
                    const params: UserSearchParams = {
                        type: 'babysitters',
                        created_after: sub(new Date(), { years: 2 }).toISOString(),
                        age: item,
                    };
                    if (hasCoordinates) {
                        params.distance = 20;
                    }
                    const results = await userSearch.hourlyRateStatistic(params);
                    const usersCount = results.reduce((acc, current) => {
                        return acc + current?.doc_count;
                    }, 0);
                    if (usersCount < 10 && hasCoordinates) {
                        delete params.distance;
                        return userSearch.hourlyRateStatistic(params);
                    } else {
                        return results;
                    }
                }),
            );
            const currencyFormat = CountrySettingsRoute.localizeMoneyFormat(brandConfigSettings.hourlyRateMoneyFormat, req.localeId);
            const formattedStatistics = statistics.map(item => {
                return (
                    this.getAverageHourlyRate(this.elasticStatisticToObject(item), brandConfigSettings.hourlyRateOptions, currencyFormat) ??
                    '-'
                );
            });
            const translator = await TranslationsService.translator({ localeId: req.localeId, groupName: 'api', prefix: 'ageGroup.' });
            const statisticString = formattedStatistics.reduce((acc, current, index) => {
                let ret = acc;
                if (index > 0) {
                    ret += '\n';
                }
                const translationName = index === 0 ? 'ageGroup.students' : index === 1 ? 'ageGroup.adult' : 'ageGroup.retired';
                ret += translator.translated(translationName, { '[amount]': current }, false);
                return ret;
            }, '');

            const serializer = new JSONAPISerializer('hourly-rates-statistic', {
                attributes: ['statisticString'],
                keyForAttribute: 'camelCase',
            });
            res.json(serializer.serialize({ statisticString }));
        } catch (error) {
            return this.serverError(req, res, error as Error);
        }
    }

    private elasticSearchParameters(params: UserSearchParamsInput, place: Place) {
        const must = [{ webrole_id: 2 }, { has_avatar: 1 }, { active: 1 }, { completed: 1 }, { disabled: 0 }, { private_only: 0 }].map(
            item => {
                return { term: item };
            },
        );

        const should: unknown[] = [
            {
                term: {
                    gender: {
                        value: 'f',
                        boost: 30,
                    },
                },
            },
        ];

        const age = params.filter.age;
        if (age?.min && age.max) {
            should.push({
                range: {
                    birthdate: {
                        gte: `now-${+age.max + 1}y`,
                        lte: `now-${age.min}y`,
                        boost: 10,
                    },
                },
            });
        }
        const chores = params.filter.fosterChores as Record<string, unknown>;
        if (chores) {
            if (chores.cooking) {
                should.push({
                    term: {
                        foster_cooking: {
                            value: 1,
                            boost: 1,
                        },
                    },
                });
            }
            if (chores.homework) {
                should.push({
                    term: {
                        foster_homework: {
                            value: 1,
                            boost: 1,
                        },
                    },
                });
            }
            if (chores.driving) {
                should.push({
                    term: {
                        foster_driving: {
                            value: 1,
                            boost: 1,
                        },
                    },
                });
            }
            if (chores.shopping) {
                should.push({
                    term: {
                        foster_shopping: {
                            value: 1,
                            boost: 1,
                        },
                    },
                });
            }
        }

        const maxBabysitChildren = params.filter.maxBabysitChildren;
        if (maxBabysitChildren) {
            should.push({
                range: {
                    max_babysit_children: { gte: maxBabysitChildren },
                },
            });
        }

        const yearsOfExperience = params.filter.yearsOfExperience;
        if (yearsOfExperience) {
            should.push({
                range: {
                    years_experience: { gte: yearsOfExperience },
                },
            });
        }

        const placeId = place.canonical_place_id ?? place.instance_id;
        if (placeId) {
            should.push({
                term: {
                    place_id: {
                        value: placeId,
                        boost: 30,
                    },
                },
            });
        }

        return {
            limit: 4,
            custom: {
                function_score: {
                    query: {
                        bool: {
                            must,
                            should,
                            must_not: [
                                {
                                    term: {
                                        is_sitly_account: 1,
                                    },
                                },
                            ],
                        },
                    },
                    functions: [
                        {
                            gauss: {
                                last_login: {
                                    scale: '60d',
                                },
                            },
                            weight: 20,
                        },
                    ],
                },
            },
        };
    }

    private getAverageHourlyRate(statistic: Record<string, number>, hourlyRateOptions: HourlyRateOptionsInterface, currencyFormat: string) {
        if (!statistic || statistic.length === 0) {
            return null;
        }

        let totalSum = 0;
        let totalCount = 0;
        Util.keysOf(hourlyRateOptions).forEach(key => {
            const average = this.averageRateForString(hourlyRateOptions[key]);
            const statisticItem = statistic[key.replace('_', '-')];
            if (average && statisticItem) {
                totalSum += average * statisticItem;
                totalCount += statisticItem;
            }
        });

        if (totalSum === 0) {
            return null;
        }

        const average = totalSum / totalCount;
        return currencyFormat.replace('[amount]', (Math.ceil(average / 0.5) * 0.5).toFixed(2));
    }

    private averageRateForString(str: string) {
        const matches = str?.replace('-', '_').match(/[+-]?\d+(?:\.\d+)?/g);
        return matches && matches?.length > 0 ? matches.reduce((a, b) => a + parseFloat(b), 0) / matches.length : null;
    }

    private elasticStatisticToObject(statistic: NestedAggsResults[]) {
        return statistic.reduce(
            (acc, value) => {
                acc[value?.key] = value?.doc_count;
                return acc;
            },
            {} as Record<string, number>,
        );
    }
}
