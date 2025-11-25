import { Request } from 'express';
import { values, isPlainObject } from 'lodash';
import { Util } from '../utils/util';
import { DateUtil } from '../utils/date-util';
import validator from 'validator';
import { allFosterChores } from '../models/user/foster-properties.model';
import { fostersRelevanceScoringFunctions, parentsTestRelevanceScoringFunctions } from './relevance-sorting/relevance-scoring-functions';
import { ValidationRules } from '../models/validation-rules';
import { Availability } from '../models/serialize/user-response';
import { validatePage } from '../routes/common-validators';
import { User } from '../models/user/user.model';

const ageOptions = ['min', 'max'];

export function sanitizeCityStatistics(req: Request) {
    sanitizeSearch(req);

    req.checkQuery('filter.place').notEmpty().withMessage({
        code: 'REQUIRED',
        title: 'A place must be provided',
    });

    const allowedTypes = ['babysitters', 'childminders'];
    req.checkQuery('type')
        .callback((value: string, themes: string) => {
            return themes.indexOf(value) > -1;
        }, allowedTypes)
        .withMessage({
            code: 'INVALID_VALUE',
            title: `Type must be one of ${allowedTypes}`,
        });
}

export function sanitizeSearch(req: Request, contextUser?: User) {
    const isGet = req.method.toLowerCase() === 'get';
    const data = (isGet ? req.query : req.body) as { 'filter'?: Record<string, unknown>; 'meta-only': unknown };
    const checkMethod = isGet ? req.checkQuery : req.checkBody;

    // sanitize availability
    const availability = data?.filter?.availability as Availability;
    if (availability) {
        for (const weekDay of Util.keysOf(availability)) {
            for (const dayPart of DateUtil.dayParts) {
                const dayPartValue = availability[weekDay]?.[dayPart];
                if (dayPartValue && Util.isTruthy(dayPartValue)) {
                    availability[weekDay][dayPart] = true;
                } else if (typeof dayPartValue !== 'undefined') {
                    delete availability[weekDay][dayPart];
                }
            }
        }

        const role = data?.filter?.role as string | undefined;
        if (data.filter && role === 'parent') {
            data.filter.availabilityPreference = data.filter.availability;
            delete data.filter.availability;
        }
    }
    const objectToArray = (object: unknown) => {
        if (isPlainObject(object)) {
            return values(object) as unknown[];
        }
        return object;
    };

    ['exclude-users', 'include-users'].forEach(filter => {
        const userUrls = data?.filter?.[filter] as string;
        if (data.filter && userUrls) {
            data.filter[filter] = objectToArray(userUrls);
        }
    });

    (isGet ? req.sanitizeQuery : req.sanitizeBody)('filter.distance').toInt();

    const placeLength = { min: 1 };
    const sortTypes = [
        'relevance',
        'avatar',
        'random',
        'created',
        'about',
        'recent-activity',
        'age',
        'recommendations',
        'distance',
        'created-after',
    ];

    const includeTypes = ['place', 'children', 'references', 'recommendations'];
    const roles: Record<string, string[]> = {
        babysitter: ['parent'],
        childminder: ['parent'],
        parent: ['childminder', 'babysitter', 'parent'],
    };

    if (contextUser) {
        checkMethod('filter.role')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'A role must be provided',
            })
            .isIn(roles[contextUser.roleName ?? ''])
            .withMessage({
                code: 'INVALID_VALUE',
                title: `Role must be one of [${roles[contextUser.roleName ?? '']}]`,
            });

        if (req.gemUser) {
            const allowedKeys = Object.keys(
                contextUser.isParent ? fostersRelevanceScoringFunctions : parentsTestRelevanceScoringFunctions,
            ).sort((a, b) => a.localeCompare(b));
            checkMethod('relevanceSortingWeights')
                .notEmpty()
                .withMessage({
                    code: 'REQUIRED',
                    title: 'A relevanceSortingWeights must be provided',
                })
                .callback((value: object) => {
                    if (!isPlainObject(value)) {
                        return false;
                    }
                    return (
                        Object.keys(value)
                            .sort((a, b) => a.localeCompare(b))
                            .join() === allowedKeys.join()
                    );
                })
                .withMessage({
                    code: 'INVALID_VALUE',
                    title: `relevanceSortingWeights must contain keys: ${allowedKeys}`,
                })
                .callback((value: object) => {
                    if (!isPlainObject(value)) {
                        return false;
                    }
                    return Object.values(value).every(item => !Number.isNaN(Number(item)) && item > 0);
                })
                .withMessage({
                    code: 'INVALID_VALUE',
                    title: 'relevanceSortingWeights values must all be numbers > 0',
                });
        }
    } else {
        const types = ['babysitters', 'childminders', 'babysit-jobs', 'childminder-jobs', 'parents-for-parents'];
        if (data['meta-only'] === '1') {
            types.push('all');
            // only be able to request all users for a count, not for an actual list of users
        }

        if (!data?.filter?.['include-users']) {
            // type requirement not needed for white-list
            checkMethod('type')
                .notEmpty()
                .withMessage({
                    code: 'REQUIRED',
                    title: 'A search type must be provided',
                })
                .callback((value: string, types: string) => {
                    return types.indexOf(value) > -1;
                }, types)
                .withMessage({
                    code: 'INVALID_VALUE',
                    title: `Type must be one of ${types}`,
                });
        }
    }

    validatePage({ req });

    checkMethod('filter.place')
        .optional()
        .isLength(placeLength)
        .withMessage({
            code: 'INVALID_LENGTH',
            title: `Place must be at least ${placeLength.min} character(s) long`,
        });
    const postalCodeLength = {
        min: 4,
        max: 12,
    };

    checkMethod('filter.postal-code')
        .optional()
        .isLength(postalCodeLength)
        .withMessage({
            code: 'INVALID_LENGTH',
            title: `Postal code must be between ${postalCodeLength.min} and ${postalCodeLength.max} character(s) long`,
        });

    checkMethod('filter.postal-code-margin').optional().isInt().withMessage({
        code: 'INVALID_FORMAT',
        title: 'Postal code margin must be a number',
    });

    checkMethod('filter.created-before').optional().isISO8601().withMessage({
        code: 'INVALID_FORMAT',
        title: 'created-before must be a valid ISO 8601 date',
    });

    checkMethod('filter.include-users')
        .optional()
        .callback((value: unknown) => value instanceof Array)
        .withMessage({
            code: 'INVALID_FORMAT',
            title: 'include-users must be an array',
        });

    checkMethod('filter.exclude-users')
        .optional()
        .callback((value: unknown) => value instanceof Array)
        .withMessage({
            code: 'INVALID_FORMAT',
            title: 'exclude-users must be an array',
        });

    checkMethod('meta-only').optional().isIn(['0', '1']).withMessage({
        code: 'INVALID_VALUE',
        title: 'meta-only must be 0 or 1',
    });

    checkMethod('sort')
        .optional()
        .callback((value: string, sortTypes: string[]) => {
            const sortValues = value.split(',');
            for (const sortValue of sortValues) {
                if (!sortTypes.find(sortType => sortValue.startsWith(sortType))) {
                    return false;
                }
            }
            return true;
        }, sortTypes)
        .withMessage({
            code: 'INVALID_VALUE',
            title: `Sort values must be in ${sortTypes.toString()}`,
        });

    checkMethod('include')
        .optional()
        .callback((value: string, includeTypes: string) => {
            const includeValues = value.split(',');
            for (const includeValue of includeValues) {
                if (includeTypes.indexOf(includeValue) === -1) {
                    return false;
                }
            }
            return true;
        }, includeTypes)
        .withMessage({
            code: 'INVALID_VALUE',
            title: `Include values must be in ${includeTypes.toString()}`,
        });

    checkMethod('filter.bounds')
        .optional()
        .callback((value: string) => {
            return typeof value === 'object' && 'north' in value && 'east' in value && 'south' in value && 'west' in value;
        })
        .withMessage({
            code: 'INVALID_VALUE',
            title: 'bounds must contain keys: north, east, south, west',
        });

    checkMethod('filter.bounds.north')
        .optional()
        .isFloat({
            min: -90,
            max: 90,
        })
        .withMessage({
            code: 'INVALID_VALUE',
            title: 'north must be between -90 and 90',
        });

    checkMethod('filter.bounds.south')
        .optional()
        .isFloat({
            min: -90,
            max: 90,
        })
        .withMessage({
            code: 'INVALID_VALUE',
            title: 'south must be between -90 and 90',
        });

    checkMethod('filter.bounds.east')
        .optional()
        .isFloat({
            min: -180,
            max: 180,
        })
        .withMessage({
            code: 'INVALID_VALUE',
            title: 'east must be between -180 and 180',
        });
    checkMethod('filter.bounds.west')
        .optional()
        .isFloat({
            min: -180,
            max: 180,
        })
        .withMessage({
            code: 'INVALID_VALUE',
            title: 'west must be between -180 and 180',
        });

    checkMethod('filter.distance').optional().isInt({ gt: 0 }).withMessage({
        code: 'INVALID_FORMAT',
        title: 'distance must be an integer bigger then 0',
    });

    checkMethod('filter.maxBabysitChildren').optional().isInt().withMessage({
        code: 'INVALID_FORMAT',
        title: 'maxBabysitChildren must be an integer',
    });
    checkMethod('filter.yearsOfExperience').optional().isInt().withMessage({
        code: 'INVALID_FORMAT',
        title: 'yearsOfExperience must be an integer',
    });

    checkMethod('filter.availability')
        .optional()
        .callback((availability: Record<string, Record<string, boolean>>) => {
            const keys = Util.keysOf(availability) as (keyof Availability)[];
            const diff = keys.filter(day => DateUtil.weekDays.indexOf(day) < 0);

            if (diff.length > 0) {
                return false;
            }
            for (const weekday of Object.keys(availability)) {
                const dayParts = availability[weekday];

                if (typeof dayParts !== 'object') {
                    return false;
                }
                for (const dayPart in dayParts) {
                    if ([true, false].indexOf(dayParts[dayPart]) === -1) {
                        return false;
                    }
                }
            }
            return true;
        })
        .withMessage({
            code: 'INVALID_FORMAT',
            title: 'availability must be in format: filter[availability][tuesday][afternoon]=1&filter[availability][wednesday][evening]=1',
        });

    checkMethod('filter.isAvailableAfterSchool').optional().custom(Util.isBooly).withMessage({
        code: 'INVALID_FORMAT',
        title: 'isAvailableAfterSchool must be a boolean value',
    });

    checkMethod('filter.isAvailableOccasionally').optional().custom(Util.isBooly).withMessage({
        code: 'INVALID_FORMAT',
        title: 'isAvailableOccasionally must be a boolean value',
    });

    checkMethod('filter.isAvailableRegularly').optional().custom(Util.isBooly).withMessage({
        code: 'INVALID_FORMAT',
        title: 'isAvailableRegularly must be a boolean value',
    });

    checkMethod('filter.isRemoteTutor').optional().custom(Util.isBooly).withMessage({
        code: 'INVALID_FORMAT',
        title: 'isRemoteTutor must be a boolean value',
    });

    checkMethod('filter.lookingForRemoteTutor').optional().custom(Util.isBooly).withMessage({
        code: 'INVALID_FORMAT',
        title: 'lookingForRemoteTutor must be a boolean value',
    });

    checkMethod('filter.lookingForAfterSchool').optional().custom(Util.isBooly).withMessage({
        code: 'INVALID_FORMAT',
        title: 'lookingForAfterSchool must be a boolean value',
    });
    checkMethod('filter.lookingForRegularCare').optional().custom(Util.isBooly).withMessage({
        code: 'INVALID_FORMAT',
        title: 'lookingForRegularCare must be a boolean value',
    });
    checkMethod('filter.lookingForOccasionalCare').optional().custom(Util.isBooly).withMessage({
        code: 'INVALID_FORMAT',
        title: 'lookingForOccasionalCare must be a boolean value',
    });
    checkMethod('filter.isEducated').optional().custom(Util.isBooly).withMessage({
        code: 'INVALID_FORMAT',
        title: 'isEducated must be a boolean value',
    });

    checkMethod('filter.isExperienced').optional().custom(Util.isBooly).withMessage({
        code: 'INVALID_FORMAT',
        title: 'isExperienced must be a boolean value',
    });

    checkMethod('filter.isSmoker').optional().custom(Util.isFalsy).withMessage({
        code: 'INVALID_VALUE',
        title: 'isSmoker can only be falsy',
    });
    checkMethod('filter.hasReferences').optional().custom(Util.isBooly).withMessage({
        code: 'INVALID_FORMAT',
        title: 'hasReferences must be a boolean value',
    });
    const nativeLanguageCodeLength = { min: 2, max: 4 };
    checkMethod('filter.nativeLanguage')
        .optional()
        .isLength(nativeLanguageCodeLength)
        .withMessage({
            code: 'INVALID_LENGTH',
            title: `nativeLanguage must be a language code between ${nativeLanguageCodeLength.min} and ${nativeLanguageCodeLength.max} characters long`,
        });

    checkMethod('filter.languages')
        .optional()
        .callback((value: unknown) => value instanceof Array)
        .withMessage({
            code: 'INVALID_FORMAT',
            title: 'languages must be an array',
        });

    checkMethod('filter.averageHourlyRate')
        .optional()
        .callback((value: unknown) => value instanceof Array)
        .withMessage({
            code: 'INVALID_FORMAT',
            title: 'averageHourlyRate must be an array',
        })
        .callback((values: string[]) => {
            return values.every?.(value => ValidationRules.hourlyRateOptions.includes(value));
        })
        .withMessage({
            code: 'INVALID_VALUE',
            title: `averageHourlyRate must be in ${ValidationRules.hourlyRateOptions}`,
        });

    checkMethod('filter.maxNumberOfChildren').optional().isInt().withMessage({
        code: 'INVALID_FORMAT',
        title: 'maxNumberOfChildren must be a number',
    });

    checkMethod('filter.fosterChores')
        .optional()
        .callback((value: object, chores: string[]) => {
            const valueKeys = Object.keys(value);
            const wrongKeys = valueKeys.filter(key => !chores.includes(key));
            return !wrongKeys.length;
        }, allFosterChores)
        .withMessage({
            code: 'INVALID_VALUE',
            title: `Chores must be in ${allFosterChores}`,
        });

    for (const fosterChoresOption of allFosterChores) {
        checkMethod(`filter.fosterChores.${fosterChoresOption}`)
            .optional()
            .custom(Util.isBooly)
            .withMessage({
                code: 'INVALID_FORMAT',
                title: `filter.fosterChores.${fosterChoresOption} must be a boolean value`,
            });
    }

    checkMethod('filter.ageGroupExperience')
        .optional()
        .callback((value: object, ageGroupExperienceOptions: string[]) => {
            const valueKeys = Object.keys(value);
            const wrongKeys = valueKeys.filter(key => !ageGroupExperienceOptions.includes(key));
            return !wrongKeys.length;
        }, ValidationRules.ageGroupExperienceOptions)
        .withMessage({
            code: 'INVALID_VALUE',
            title: `ageGroupExperience must be in ${ValidationRules.ageGroupExperienceOptions}`,
        });

    for (const ageGroupExperienceOption of ValidationRules.ageGroupExperienceOptions) {
        checkMethod(`filter.ageGroupExperience.${ageGroupExperienceOption}`).optional().custom(Util.isBooly).withMessage({
            code: 'INVALID_FORMAT',
            title: 'ageGroupExperience must be a boolean value',
        });
    }

    checkMethod('filter.fosterLocation')
        .optional()
        .callback((value: string) => {
            const valueKeys = Object.keys(value);
            const wrongKeys = valueKeys.filter(key => ['visit', 'receive'].indexOf(key) < 0);
            return !wrongKeys.length;
        })
        .withMessage({
            code: 'INVALID_VALUE',
            title: 'Foster Location can only contain receive/visit',
        });

    checkMethod('filter.fosterLocation.visit').optional().custom(Util.isBooly).withMessage({
        code: 'INVALID_FORMAT',
        title: 'Foster location - visit must be a boolean value',
    });

    checkMethod('filter.fosterLocation.receive').optional().custom(Util.isBooly).withMessage({
        code: 'INVALID_FORMAT',
        title: 'Foster location - receive must be a boolean value',
    });

    checkMethod('filter.ageOfChildren')
        .optional()
        .callback((value: object, keys: string[]) => {
            const valueKeys = Object.keys(value);
            const wrongKeys = valueKeys.filter(key => !keys.includes(key));
            return !wrongKeys.length;
        }, ageOptions)
        .withMessage({
            code: 'INVALID_VALUE',
            title: `Age of children must be in ${ageOptions}`,
        });

    checkMethod('filter.ageOfChildren.min').optional().isInt().withMessage({
        code: 'INVALID_FORMAT',
        title: 'min-age must be a number',
    });

    checkMethod('filter.ageOfChildren.max').optional().isInt().withMessage({
        code: 'INVALID_FORMAT',
        title: 'max-age must be a number',
    });

    checkMethod('filter.age')
        .optional()
        .callback((value: object, keys: string[]) => {
            const valueKeys = Object.keys(value);
            const wrongKeys = valueKeys.filter(key => !keys.includes(key));
            return !wrongKeys.length;
        }, ageOptions)
        .withMessage({
            code: 'INVALID_VALUE',
            title: `Age must be in ${ageOptions}`,
        });

    checkMethod('filter.age.min').optional().isInt().withMessage({
        code: 'INVALID_FORMAT',
        title: 'min-age must be a number',
    });

    checkMethod('filter.age.max').optional().isInt().withMessage({
        code: 'INVALID_FORMAT',
        title: 'max-age must be a number',
    });

    checkMethod('filter.active-after')
        .optional()
        .callback((value: string) => {
            if (validator.isISO8601(value)) {
                return true;
            }
            return DateUtil.isTimeUnit(value);
        })
        .withMessage({
            code: 'INVALID_FORMAT',
            title: 'active-after must be a valid date or time-unit',
        });

    checkMethod('group').optional().custom(Util.isBooly).withMessage({
        code: 'INVALID_FORMAT',
        title: 'group must be boolean',
    });

    checkMethod('groupDistribution').optional().isInt().withMessage({
        code: 'INVALID_FORMAT',
        title: 'group must be a number',
    });

    checkMethod('zoom').optional().isInt().withMessage({
        code: 'INVALID_FORMAT',
        title: 'zoom must be a number',
    });
}
