import { Availability } from '../../models/serialize/user-response';
import { Util } from '../../utils/util';
import { ScoringOptions } from './relevance-scoring-options';

enum ExperienceAgeGroup {
    youngerThanOne = '0',
    oneToThree = '1_3',
    fourToSix = '4_6',
    sevenToEleven = '7_11',
    twelveAndOlder = '12plus',
}

const filterBoolMust = (queries: unknown[], weight: number) => {
    return {
        filter: {
            bool: {
                must: queries,
            },
        },
        weight,
    };
};

export const relevanceScoringFunctions = {
    distance: (weight: number, scoringOptions: ScoringOptions) => {
        if (scoringOptions.locationOptions) {
            let offset = 3;
            if (scoringOptions.locationOptions.maxDistance <= 15) {
                offset = 2;
            }
            if (scoringOptions.locationOptions.maxDistance <= 10) {
                offset = 1;
            }
            if (scoringOptions.locationOptions.maxDistance <= 5) {
                offset = 0;
            }

            return {
                gauss: {
                    map_point: {
                        origin: {
                            lat: scoringOptions.locationOptions.center.latitude,
                            lon: scoringOptions.locationOptions.center.longitude,
                        },
                        offset: `${offset}km`,
                        scale: `${scoringOptions.locationOptions.maxDistance}km`,
                        decay: 0.1,
                    },
                },
                weight,
            };
        }
    },
    lastSearchActivity: (weight: number, _scoringOptions: ScoringOptions) => {
        return {
            filter: {
                exists: {
                    field: 'last_search_activity',
                },
            },
            exp: {
                last_search_activity: {
                    scale: '30d',
                    decay: 0.01,
                },
            },
            weight,
        };
    },
    lastSearchActivityConst: (weight: number, _scoringOptions: ScoringOptions) => {
        return filterBoolMust(
            [
                {
                    range: {
                        last_search_activity: {
                            gte: 'now-14d',
                        },
                    },
                },
            ],
            weight,
        );
    },
    receivedMessageCount: (weight: number, _scoringOptions: ScoringOptions) => {
        return {
            linear: {
                messages_received_last_month: {
                    origin: 0,
                    scale: 10,
                    decay: 0.1,
                },
            },
            weight,
        };
    },
    availability: (weight: number, scoringOptions: ScoringOptions) => {
        if (scoringOptions.availability) {
            const weekDays = Util.keysOf(scoringOptions.availability);
            const getDayPartLength = (dayPart: keyof Availability) => {
                if (!isFinite(Number(dayPart))) {
                    return Object.values(scoringOptions.availability?.[dayPart] ?? {}).filter(bool => bool).length;
                }
                return 0;
            };

            const divider = weekDays.reduce((acc, curr) => {
                acc += getDayPartLength(curr);
                return acc;
            }, 0);

            let dayPartWeight = Math.round(weight / Number(divider));
            // adds a bonus of 1.5 when the availability was recently updated
            let recentlyUpdatedDayPartWeight = Math.round(weight / Number(divider) / 2);
            dayPartWeight = dayPartWeight > 2 ? dayPartWeight : 2;
            recentlyUpdatedDayPartWeight = recentlyUpdatedDayPartWeight > 2 ? recentlyUpdatedDayPartWeight : 2;

            return scoringOptions
                .availabilityDayParts()
                .map(item => {
                    return [
                        filterBoolMust([item], dayPartWeight),
                        filterBoolMust(
                            [
                                item,
                                {
                                    range: {
                                        availability_updated: {
                                            gte: 'now-29d',
                                        },
                                    },
                                },
                            ],
                            recentlyUpdatedDayPartWeight,
                        ),
                    ];
                })
                .flatMap(item => item);
        }
        return [];
    },
    premium: (weight: number, _scoringOptions: ScoringOptions) => {
        return filterBoolMust(
            [
                {
                    range: {
                        premium: {
                            gte: 'now',
                        },
                    },
                },
                {
                    range: {
                        initial_premium_date: {
                            gte: 'now-29d',
                        },
                    },
                },
            ],
            weight,
        );
    },
};

export const parentsRelevanceScoringFunctions = {
    ...relevanceScoringFunctions,
    babyExperience: (weight: number, scoringOptions: ScoringOptions) => {
        const babyExperience = scoringOptions.typeExperience
            ?.split(',')
            .some(item => (item as ExperienceAgeGroup) === ExperienceAgeGroup.youngerThanOne);
        if (babyExperience) {
            return filterBoolMust(
                [
                    {
                        range: {
                            children_min_birthdate: {
                                gte: 'now-1y',
                            },
                        },
                    },
                ],
                weight,
            );
        }
    },
    receivedInvitesCountLastDay: (weight: number, _scoringOptions: ScoringOptions) => {
        return {
            linear: {
                received_invites_count_last_day: {
                    origin: 0,
                    scale: 10,
                    decay: 0.0001,
                },
            },
            weight,
        };
    },
    maxBabysitChildren: (weight: number, scoringOptions: ScoringOptions) => {
        if (scoringOptions.maxBabysitChildren) {
            return filterBoolMust(
                [
                    {
                        range: {
                            children_count: {
                                lte: scoringOptions.maxBabysitChildren,
                            },
                        },
                    },
                ],
                weight,
            );
        }
    },
};

export const parentsTestRelevanceScoringFunctions = {
    ...parentsRelevanceScoringFunctions,
    avatar: (weight: number, _scoringOptions: ScoringOptions) => {
        return filterBoolMust(
            [
                {
                    match: {
                        has_avatar: 1,
                    },
                },
            ],
            weight,
        );
    },
};

export const fostersRelevanceScoringFunctions = {
    ...relevanceScoringFunctions,
    babyExperience: (weight: number, scoringOptions: ScoringOptions) => {
        if (scoringOptions.children?.length) {
            const hasBaby = !!scoringOptions.children.filter(child => child.age === 0).length;
            if (hasBaby) {
                return filterBoolMust(
                    [
                        {
                            wildcard: {
                                type_experience: '0*',
                            },
                        },
                    ],
                    weight,
                );
            }
        }
    },
    avatar: (weight: number, _scoringOptions: ScoringOptions) => {
        return filterBoolMust(
            [
                {
                    match: {
                        has_avatar: 1,
                    },
                },
            ],
            weight,
        );
    },
    aboutLength: (weight: number, _scoringOptions: ScoringOptions) => {
        return filterBoolMust(
            [
                {
                    range: {
                        about_length: {
                            gte: 100,
                        },
                    },
                },
            ],
            weight,
        );
    },
    neutralRecommendations: (weight: number, _scoringOptions: ScoringOptions) => {
        return {
            filter: {
                bool: {
                    must_not: {
                        exists: {
                            field: 'average_recommendation_score',
                        },
                    },
                },
            },
            weight,
        };
    },
    positiveRecommendations: (weight: number, _scoringOptions: ScoringOptions) => {
        return filterBoolMust(
            [
                {
                    range: {
                        average_recommendation_score: {
                            gte: 4,
                        },
                    },
                },
            ],
            weight,
        );
    },
    childrenCount: (weight: number, scoringOptions: ScoringOptions) => {
        if (scoringOptions.children?.length) {
            return filterBoolMust(
                [
                    {
                        range: {
                            max_babysit_children: {
                                gte: scoringOptions.children.length,
                            },
                        },
                    },
                ],
                weight,
            );
        }
    },
};
