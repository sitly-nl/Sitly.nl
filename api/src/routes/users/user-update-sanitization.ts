import { Language } from '../../Language';
import { allFosterChores, allFosterSkills, allFosterTraits } from '../../models/user/foster-properties.model';
import { Request } from 'express';
import { Util } from '../../utils/util';
import { TextAnalyzerService } from '../../services/text-analyzer.service';
import { config } from '../../../config/config';
import { CountrySettingsRoute } from '../country-settings';
import { AvatarOverlayType } from '../../models/user/custom-user.model';
import { DateUtil } from '../../utils/date-util';
import { Environment } from '../../services/env-settings.service';
import { ValidationRules } from '../../models/validation-rules';
import { Availability } from '../../models/serialize/user-response';
import { User, WebRoleId, allUserRoles } from '../../models/user/user.model';
import { differenceInYears, parseISO } from 'date-fns';

export const sanitizeUserUpdate = (req: Request, user?: User) => {
    // sanitize availability
    for (const prop of ['availability', 'availabilityPreference']) {
        if (req.body?.[prop]) {
            for (const weekDay of Object.keys(req.body[prop] as object)) {
                for (const dayPart of DateUtil.dayParts) {
                    const dayPartValue = req.body[prop][weekDay]?.[dayPart] as never;
                    if (Util.isTruthy(dayPartValue)) {
                        req.body[prop][weekDay][dayPart] = true;
                    } else if (Util.isFalsy(dayPartValue)) {
                        req.body[prop][weekDay][dayPart] = false;
                    }
                }
            }
        }
    }

    req.sanitizeBody('firstName').trim();
    req.sanitizeBody('lastName').trim();
    req.sanitizeBody('password').trim();
    req.sanitizeBody('about').trim();
    req.sanitizeBody('place').trim();
    req.sanitizeBody('streetName').trim();
    if (req.body.houseNumber) {
        req.body.houseNumber = (req.body.houseNumber as number | string).toString();
        req.sanitizeBody('houseNumber').trim();
    }

    req.checkBody('email')
        .optional()
        .notEmpty()
        .withMessage({
            code: 'REQUIRED',
            title: 'E-mail is required',
        })
        .isEmail()
        .withMessage({
            code: 'INVALID_FORMAT',
            title: 'Invalid e-mail address',
        })
        .callback((value: string) => {
            if (value?.trim().endsWith('.ru')) {
                return false;
            }
            return true;
        });

    req.checkBody('firstName')
        .optional()
        .isLength(ValidationRules.user.firstName.length)
        .withMessage({
            code: 'INVALID_LENGTH',
            title: `First name must be between ${ValidationRules.user.firstName.length.min} and ${ValidationRules.user.firstName.length.max} characters long`,
        })
        .matches(/^[^0-9@]+$/)
        .withMessage({
            code: 'INVALID_VALUE',
            title: 'First name may not contain @ or numbers',
        });

    req.checkBody('lastName')
        .optional()
        .isLength(ValidationRules.user.lastName.length)
        .withMessage({
            code: 'INVALID_LENGTH',
            title: `Last name must be between ${ValidationRules.user.lastName.length.min} and ${ValidationRules.user.lastName.length.max} characters long`,
        })
        .matches(/^[^0-9@]+$/)
        .withMessage({
            code: 'INVALID_VALUE',
            title: 'Last name may not contain @ or numbers',
        });

    req.checkBody('password')
        .optional()
        .withMessage({
            code: 'REQUIRED',
            title: 'Password is required',
        })
        .isLength({ min: ValidationRules.user.password.length.min })
        .withMessage({
            code: 'INVALID_LENGTH',
            title: `Password length must be greater than ${ValidationRules.user.password.length.min} characters`,
        });

    req.checkBody('role')
        .optional()
        .withMessage({
            code: 'REQUIRED',
            title: 'Role is required',
        })
        .isIn(allUserRoles)
        .withMessage({
            code: 'INVALID_VALUE',
            title: `Role must be one of ${allUserRoles}`,
        });

    // check boolean
    [
        'disabled',
        'invisible',
        'isAvailableAfterSchool',
        'isAvailableOccasionally',
        'isAvailableRegularly',
        'isRemoteTutor',
        'isSmoker',
        'hasFirstAidCertificate',
        'hasCertificateOfGoodBehavior',
        'hasDriversLicense',
        'hasCar',
        'hasReferences',
        'isEducated',
        'receiveNewMessagesMail',
        'hasPublicProfile',
        'shareProfileWithPartners',
        'lookingForBabysitters',
        'lookingForChildminders',
        'lookingForOccasionalCare',
        'lookingForRegularCare',
        'lookingForRemoteTutor',
        'lookingForAfterSchool',
        'subscriptionCancelled',
        'positiveFeedbackAccepted',
        'negativeFeedbackAccepted',
        'disabledSafetyMessages',
        'inappropriate',
        'active',
    ].forEach(field => {
        req.checkBody(field)
            .optional()
            .custom(Util.isBooly)
            .withMessage({
                code: 'INVALID_FORMAT',
                title: `${field} must be a boolean value`,
            });
    });

    const aboutLength = { min: 15, max: 1000 };
    const aboutValidator = req
        .checkBody('about')
        .optional()
        .isLength(aboutLength)
        .withMessage({
            code: 'INVALID_LENGTH',
            title: `About must be between ${aboutLength.min} and ${aboutLength.max} characters long`,
        })
        .callback((value: string) => {
            if (Environment.isProd) {
                return true;
            }
            return !TextAnalyzerService.isFakeAbout(value);
        })
        .withMessage({
            code: 'INVALID_VALUE',
            title: 'About should contains at least 2 words longer than 2 characters each',
        });

    if ('validate' in req.query) {
        aboutValidator
            .callback((value: string) => {
                return !TextAnalyzerService.hasPersonalData(value, []);
            })
            .withMessage({
                code: 'PERSONAL_INFO',
                title: 'About contains personal info',
            });
    }

    const educationLength = { min: 1, max: 1000 };
    const homepageLength = { min: 3, max: 200 };

    req.checkBody('education')
        .optional()
        .isLength(educationLength)
        .withMessage({
            code: 'INVALID_LENGTH',
            title: `Education must be between ${educationLength.min} and ${educationLength.max} characters long`,
        });

    req.checkBody('homepage')
        .optional()
        .isLength(homepageLength)
        .withMessage({
            code: 'INVALID_LENGTH',
            title: `Homepage must be between ${homepageLength.min} and ${homepageLength.max} characters long`,
        });

    req.checkBody('gender').optional().isIn(['male', 'female']).withMessage({
        code: 'INVALID_VALUE',
        title: 'Gender must be "male" or "female"',
    });

    if (user) {
        let ageValidationErrorMessage;
        req.checkBody('birthdate')
            .optional()
            .isISO8601()
            .withMessage({
                code: 'INVALID_FORMAT',
                title: 'birthdate must be in ISO8601 format',
            })
            .callback((value: never) => {
                const birthdate = parseISO(value);
                const minSignedInt = -Math.pow(2, 31);
                if (DateUtil.dateToTimestamp(birthdate) <= minSignedInt) {
                    ageValidationErrorMessage = 'unsupported birthdate';
                    return false;
                }

                const years = differenceInYears(new Date(), birthdate);
                if (user.webrole_id === WebRoleId.babysitter) {
                    const brandConfigSettings = config.getConfig(req.brandCode);
                    ageValidationErrorMessage = `age of ${user.roleName} should be at least ${brandConfigSettings.babysitterMinAge} years`;
                    return years >= brandConfigSettings.babysitterMinAge;
                } else if (user.webrole_id === WebRoleId.childminder) {
                    ageValidationErrorMessage = `age of ${user.roleName} should be at least ${CountrySettingsRoute.childminderMinAge} years`;
                    return years >= CountrySettingsRoute.childminderMinAge;
                }
            })
            .withMessage({
                code: 'INVALID_VALUE',
                title: ageValidationErrorMessage,
            });
    }

    req.checkBody('availableFromDate').optional().isISO8601().withMessage({
        code: 'INVALID_FORMAT',
        title: 'available from date must be in ISO8601 format',
    });

    req.checkBody('avatarOverlay')
        .optional()
        .callback((value: AvatarOverlayType) => {
            return value === AvatarOverlayType.socialFilterIgnored;
        })
        .withMessage({
            code: 'INVALID_VALUE',
            title: `avatarOverlay can be updated only with ${AvatarOverlayType.socialFilterIgnored}`,
        });

    const validOccupations = ['student', 'scholar', 'employed', 'unemployed', 'householder', 'intern', 'retired'];

    req.checkBody('occupation')
        .optional()
        .isIn(validOccupations)
        .withMessage({
            code: 'INVALID_VALUE',
            title: `occupation must be one of ${validOccupations.toString()}`,
        });
    req.checkBody('fosterChores')
        .optional()
        .callback((value: object, chores: unknown[]) => {
            const valueKeys = Object.keys(value);
            const wrongKeys = valueKeys.filter(key => !chores.includes(key));
            return !wrongKeys.length;
        }, allFosterChores)
        .withMessage({
            code: 'INVALID_VALUE',
            title: `Chores must be in ${allFosterChores}`,
        });

    for (const chore of allFosterChores) {
        req.checkBody(`fosterChores.${chore}`).optional().custom(Util.isBooly).withMessage({
            code: 'INVALID_FORMAT',
            title: 'Chore must be a boolean value',
        });
    }

    const allowedFosterChores = [''].concat(allFosterChores);
    req.checkBody('choresPreference')
        .optional()
        .isIn(allowedFosterChores)
        .withMessage({
            code: 'INVALID_VALUE',
            title: `choresPreference must be in ${allowedFosterChores}`,
        });

    req.checkBody('averageHourlyRate')
        .optional()
        .isIn(ValidationRules.hourlyRateOptions)
        .withMessage({
            code: 'INVALID_VALUE',
            title: `Average hourly rate must be one of ${ValidationRules.hourlyRateOptions}`,
        });

    const allowedHourlyRates = [''].concat(ValidationRules.hourlyRateOptions);
    req.checkBody('hourlyRatesPreference')
        .optional()
        .isIn(allowedHourlyRates)
        .withMessage({
            code: 'INVALID_VALUE',
            title: `hourlyRatesPreference must be in ${allowedHourlyRates}`,
        });

    req.checkBody('ageGroupExperience')
        .optional()
        .callback((value: object, ageGroupExperienceOptions: unknown[]) => {
            const valueKeys = Object.keys(value);
            const wrongKeys = valueKeys.filter(key => !ageGroupExperienceOptions.includes(key));
            return !wrongKeys.length;
        }, ValidationRules.ageGroupExperienceOptions)
        .withMessage({
            code: 'INVALID_VALUE',
            title: `ageGroupExperience must be in ${ValidationRules.ageGroupExperienceOptions}`,
        });

    for (const ageGroupExperienceOption of ValidationRules.ageGroupExperienceOptions) {
        req.checkBody(`ageGroupExperience.${ageGroupExperienceOption}`).optional().custom(Util.isBooly).withMessage({
            code: 'INVALID_FORMAT',
            title: 'ageGroupExperience must be a boolean value',
        });
    }

    const yearsOfExperienceOptions: string[] = ['0', '1', '2', '3', '4', '5', '5plus'];
    req.checkBody('yearsOfExperience')
        .optional()
        .isIn(yearsOfExperienceOptions)
        .withMessage({
            code: 'INVALID_VALUE',
            title: `yearsOfExperience must be in ${yearsOfExperienceOptions}`,
        });

    const maxChildrenOptions: string[] = ['1', '2', '3', '4', '5'];

    req.checkBody('maxChildren')
        .optional()
        .isIn(maxChildrenOptions)
        .withMessage({
            code: 'INVALID_VALUE',
            title: `maxChildren must be in ${maxChildrenOptions}`,
        });

    const languageCodes = Language.languageCodes();

    req.checkBody('nativeLanguage').optional().isIn(languageCodes).withMessage({
        code: 'INVALID_VALUE',
        title: 'nativeLanguage must be a valid language code',
    });

    req.checkBody('languages')
        .optional()
        .callback((languages: unknown[], languageCodes: unknown[]) => {
            const wrongLanguageCodes = languages.filter(key => !languageCodes.includes(key));
            return !wrongLanguageCodes.length;
        }, languageCodes)
        .withMessage({
            code: 'INVALID_VALUE',
            title: 'languages must be an array of valid language codes',
        });

    const allowedSkills = [''].concat(allFosterSkills);
    req.checkBody('skills')
        .optional()
        .isIn(allowedSkills)
        .withMessage({
            code: 'INVALID_VALUE',
            title: `skills must be in ${allowedSkills}`,
        });

    req.checkBody('traits')
        .optional()
        .isIn(allFosterTraits)
        .withMessage({
            code: 'INVALID_VALUE',
            title: `traits must be in ${allFosterTraits}`,
        })
        .callback((value: string) => {
            return value?.length >= 1 && value?.length <= 3;
        })
        .withMessage({
            code: 'INVALID_VALUE',
            title: 'you can choose 1 to 3 traits',
        });

    req.checkBody('fosterLocation')
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

    req.checkBody('fosterLocation.visit').optional().custom(Util.isBooly).withMessage({
        code: 'INVALID_FORMAT',
        title: 'Foster location - visit must be a boolean value',
    });

    req.checkBody('fosterLocation.receive').optional().custom(Util.isBooly).withMessage({
        code: 'INVALID_FORMAT',
        title: 'Foster location - receive must be a boolean value',
    });

    req.checkBody('avatar').optional().isBase64().withMessage({
        code: 'INVALID_FORMAT',
        title: 'Avatar must be base64-encoded',
    });

    if (req.body.placeName !== undefined || req.body.streetName !== undefined) {
        req.checkBody('placeName').notEmpty().withMessage({
            code: 'REQUIRED',
            title: 'Place is required in combination with street name and house number',
        });

        if (req.body.latitude && req.body.longitude) {
            req.checkBody('latitude').isFloat().withMessage({
                code: 'INVALID_FORMAT',
                title: 'Address latitude must be a number',
            });
            req.checkBody('longitude').isFloat().withMessage({
                code: 'INVALID_FORMAT',
                title: 'Address longitude must be a number',
            });
        }
    } else if (req.body.postalCode) {
        req.checkBody('postalCode').notEmpty().withMessage({
            code: 'REQUIRED',
            title: 'Postalcode is required',
        });
        req.checkBody('houseNumber').matches(/\d+/).withMessage({
            code: 'INVALID_FORMAT',
            title: 'Housenumber must contain a number',
        });
    }

    const checkAvailabilityFormat = (value: Record<string, object[]>) => {
        if (typeof value !== 'object') {
            return false;
        }

        for (const weekDay of Object.keys(value)) {
            if (DateUtil.weekDays.indexOf(weekDay as keyof Availability) < 0) {
                return false;
            }

            const dayParts = value[weekDay];
            for (const part of Util.keysOf(dayParts)) {
                if (DateUtil.dayParts.indexOf(part as never) < 0 || typeof dayParts[part] !== 'boolean') {
                    return false;
                }
            }
        }

        return true;
    };

    req.checkBody('availability').optional().callback(checkAvailabilityFormat).withMessage({
        code: 'INVALID_FORMAT',
        title: 'Availability must be formatted like {monday: {morning:true|1, afternoon:false|0}}',
    });

    req.checkBody('availabilityPreference').optional().callback(checkAvailabilityFormat).withMessage({
        code: 'INVALID_FORMAT',
        title: 'Availability Preference must be formatted like {monday: {morning:true|1, afternoon:false|0}}',
    });

    // account settings
    const receiveMatchMailOptions = ['never', 'daily', 'weekly'];
    req.checkBody('receiveMatchMail')
        .optional()
        .isIn(receiveMatchMailOptions)
        .withMessage({
            code: 'INVALID_FORMAT',
            title: `receiveMatchMail must be in ${receiveMatchMailOptions.toString()}`,
        });

    req.checkBody('discountOfferedDate').optional().isISO8601().withMessage({
        code: 'INVALID_FORMAT',
        title: 'discount offer date must be in ISO8601 format',
    });

    req.checkBody('gracePeriod').optional().isISO8601().withMessage({
        code: 'INVALID_FORMAT',
        title: 'grace period date must be in ISO8601 format',
    });

    req.checkBody('premium').optional().isISO8601().withMessage({
        code: 'INVALID_FORMAT',
        title: 'premium must be in ISO8601 format',
    });

    req.checkBody('notes').optional().isString().withMessage({
        code: 'INVALID_VALUE',
        title: 'notes should be a string',
    });

    req.checkBody('activeCouponCode')
        .optional()
        .matches(/^[A-Za-z0-9-_%]+$/)
        .withMessage({
            code: 'INVALID_VALUE',
            title: 'activeCouponCode contains invalid characters',
        })
        .isString()
        .withMessage({
            code: 'INVALID_VALUE',
            title: 'activeCouponCode should be a string',
        })
        .isLength(ValidationRules.user.couponCode.length)
        .withMessage({
            code: 'INVALID_LENGTH',
            title: `activeCouponCode must be between ${ValidationRules.user.couponCode.length.min} and ${ValidationRules.user.couponCode.length.max} characters long`,
        });

    req.checkBody('localeCode').optional().isLength({ min: 1 }).withMessage({
        code: 'INVALID_VALUE',
        title: 'locale should be not empty string',
    });
};
