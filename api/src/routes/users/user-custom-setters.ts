import { CountryCode } from './../../models/brand-code';
import { AddressGeoInterface, GeocodeService } from '../../services/geocode/geocode.service';
import { Util } from '../../utils/util';
import { StringUtil } from '../../utils/string-util';
import { Language } from '../../Language';
import { SearchAvailability } from '../../search/relevance-sorting/relevance-scoring-options';
import { CommonEmailsService } from '../../services/email/common-emails.service';
import { User, WebRoleName, roleNameToRoleId } from '../../models/user/user.model';
import { FosterChores, FosterSkills, FosterTraits } from '../../models/user/foster-properties.model';
import { HourlyRate } from '../../models/user/custom-user.model';
import { DateUtil } from '../../utils/date-util';
import { config } from '../../../config/config';

export interface GeoData {
    place?: string;
    postalCode: string;
    streetName?: string;
    houseNumber?: string;
    country: CountryCode;
    locales: string[];
    latitude?: number;
    longitude?: number;
}

export class UserAsyncCustomSetters {
    static address = async (user: User, geoData: GeoData, geo: AddressGeoInterface | undefined, localeId?: number) => {
        let placeName: string | undefined;
        if (geo && geoData?.country !== CountryCode.colombia) {
            placeName = geo.placeName;
            user.customUser.map_latitude = geo.latitude ?? null;
            user.customUser.map_longitude = geo.longitude ?? null;
            user.customUser.address = geo.streetName ?? null;
            user.customUser.postal_code = geo.postalCode ?? null;
        } else {
            placeName = geoData.place;
            user.customUser.map_latitude = geoData.latitude ?? geo?.latitude ?? null;
            user.customUser.map_longitude = geoData.longitude ?? geo?.longitude ?? null;
            user.customUser.address = geoData.streetName ?? null;
            user.customUser.postal_code = geoData.postalCode ?? null;
        }
        user.customUser.housenumber = geoData.houseNumber ?? null;

        let placeUrl = StringUtil.safeString(placeName ?? '');
        const models = user.sequelize.models;
        let place = await models.Place.byPlaceUrl(placeUrl, false, localeId);
        if (!place && geo) {
            const geoService = new GeocodeService(geoData.country);
            const localeCodes = geoData.locales;

            const allLocales = await models.Locale.all();

            const findLocale = (localeCode: string) =>
                allLocales.find(locale => locale.locale_code.toLowerCase() === localeCode.toLowerCase());

            const firstLocale = findLocale(localeCodes[0]);
            const placeGeo = geo.placeName
                ? await geoService.geocodePlaceName(geo.placeName, localeCodes[0], geoData.postalCode)
                : undefined;

            if (!placeGeo) {
                return false;
            }
            placeUrl = StringUtil.safeString(placeGeo.placeName);

            if (placeGeo.placeName !== placeName) {
                place = await models.Place.byPlaceUrl(placeUrl);
            }

            if (!place) {
                place = await models.Place.create({
                    instance_order: 0,
                    place_name: placeGeo.placeName,
                    place_url: placeUrl,
                    featured: 0,
                    map_latitude: placeGeo.latitude,
                    map_longitude: placeGeo.longitude,
                    webuser_count: 1,
                    locale_id: firstLocale?.locale_id,
                });

                if (localeCodes.length > 1) {
                    const remainingLocaleCodes = localeCodes.slice(1);
                    for (const remainingLocaleCode of remainingLocaleCodes) {
                        const remainingLocale = findLocale(remainingLocaleCode);
                        const canonicalPlaceGeo = geoData.place
                            ? await geoService.geocodePlaceName(geoData.place, remainingLocaleCode)
                            : undefined;
                        const canonicalPlaceUrl = StringUtil.safeString(canonicalPlaceGeo?.placeName ?? '');
                        let canonicalPlace = await models.Place.byPlaceUrl(canonicalPlaceUrl, false, localeId);

                        if (!canonicalPlace) {
                            canonicalPlace = models.Place.build({
                                instance_order: 0,
                                place_name: canonicalPlaceGeo?.placeName ?? '',
                                place_url: canonicalPlaceUrl,
                                featured: 0,
                                map_latitude: null,
                                map_longitude: null,
                                webuser_count: 0,
                                canonical_place_id: place.instance_id,
                                locale_id: remainingLocale?.locale_id,
                            });
                        }

                        await canonicalPlace.save();
                    }
                }
            }
        }

        if (place) {
            user.customUser.place_id = place.instance_id;
            if (user.isParent) {
                let maxDistance = 5;
                if (place.babysit_count && place.babysit_count < 50) {
                    maxDistance = 20;
                } else if (place.babysit_count && place.babysit_count < 100) {
                    maxDistance = 15;
                } else if (place.babysit_count && place.babysit_count < 200) {
                    maxDistance = 10;
                }
                user.customUser.pref_max_distance = maxDistance;
            }
        }

        return user;
    };
}

export class UserCustomSetters {
    email = (userModel: User, email: string) => {
        userModel.email = email;
        userModel.customUser.email_bounced = 0;
    };
    password = (userModel: User, password: string) => {
        userModel.set(User.passwordFields(password));
    };
    availabilityPreference = (userModel: User, availability: SearchAvailability) => {
        UserCustomSetters.updateAvailability(userModel, availability, 'pref');
    };
    availability = (userModel: User, availability: SearchAvailability) => {
        UserCustomSetters.updateAvailability(userModel, availability, 'foster');
    };
    completed = (userModel: User, _value: unknown) => {
        userModel.customUser.completed = 1;
        if (userModel.isParent) {
            const lookingForChildminders = !!userModel.customUser?.pref_childminder;
            const lookingForBabysitters = !!userModel.customUser?.pref_babysitter;
            if (!lookingForBabysitters && !lookingForChildminders) {
                userModel.customUser.pref_babysitter = 1;
                userModel.customUser.pref_childminder = config.getConfig(userModel.brandCode).showChildminders ? 1 : 0;
            }
        }
    };
    gender = (userModel: User, gender: string) => {
        if (gender === 'female') {
            userModel.customUser.gender = 'f';
        }
        if (gender === 'male') {
            userModel.customUser.gender = 'm';
        }
    };
    fosterChores = (userModel: User, value: Record<string, unknown>) => {
        const choreMappings = {
            cooking: 'foster_cooking',
            chores: 'foster_chores',
            driving: 'foster_driving',
            homework: 'foster_homework',
            shopping: 'foster_shopping',
        } as const;

        for (const prop of Object.keys(value)) {
            if (!(prop in choreMappings)) {
                throw new Error(`Invalid chores field ${prop}`);
            }
            const updateValue = Util.boolyToInt(value[prop]);
            userModel.customUser.set(choreMappings[prop as never], updateValue as never);
        }
    };
    averageHourlyRate = (userModel: User, value: string) => {
        userModel.customUser.avg_hourly_rate = value.replace('-', '_') as never;
    };
    ageGroupExperience = (userModel: User, value: Record<string, unknown>) => {
        const trueValues = [];
        for (const group in value) {
            if (value[group]) {
                trueValues.push(group.replace('-', '_'));
            }
        }

        const dbValue = trueValues.join(',');
        userModel.customUser.type_experience = dbValue;
    };
    yearsOfExperience = (userModel: User, value: string) => {
        userModel.customUser.years_experience = value.toString();
    };
    isAvailableAfterSchool = (userModel: User, value: unknown) => {
        userModel.customUser.foster_after_school = Util.boolyToInt(value) as never;
    };
    isAvailableOccasionally = (userModel: User, value: unknown) => {
        userModel.customUser.foster_occasional = Util.boolyToInt(value) as never;
    };
    isAvailableRegularly = (userModel: User, value: unknown) => {
        userModel.customUser.foster_regular = Util.boolyToInt(value) as never;
    };
    isRemoteTutor = (userModel: User, value: unknown) => {
        userModel.customUser.foster_remote_tutor = Util.boolyToInt(value) as never;
    };
    isSmoker = (userModel: User, value: unknown) => {
        userModel.customUser.smoke = Util.boolyToInt(value) as never;
    };
    inappropriate = (userModel: User, value: 0 | 1) => {
        userModel.customUser.inappropriate = value;
        if (Util.isTruthy(value)) {
            userModel.customUser.quarantined_at = new Date();
        }
    };
    hasFirstAidCertificate = (userModel: User, value: unknown) => {
        if (userModel.customUser.fosterProperties) {
            userModel.customUser.fosterProperties.has_first_aid_certificate = Util.boolyToInt(value) as never;
        }
    };
    hasCertificateOfGoodBehavior = (userModel: User, value: unknown) => {
        if (userModel.customUser.fosterProperties) {
            userModel.customUser.fosterProperties.has_certificate_of_good_behavior = Util.boolyToInt(value) as never;
        }
    };
    hasDriversLicense = (userModel: User, value: unknown) => {
        if (userModel.customUser.fosterProperties) {
            userModel.customUser.fosterProperties.has_drivers_license = Util.boolyToInt(value) as never;
        }
    };
    hasCar = (userModel: User, value: unknown) => {
        if (userModel.customUser.fosterProperties) {
            userModel.customUser.fosterProperties.has_car = Util.boolyToInt(value) as never;
        }
    };
    maxChildren = (userModel: User, value: string) => {
        userModel.customUser.max_babysit_children = value;
    };
    hasReferences = (userModel: User, value: unknown) => {
        userModel.customUser.foster_references = Util.boolyToInt(value) as never;
    };
    nativeLanguage = (userModel: User, value: string) => {
        userModel.customUser.mother_language = Language.byCode(value)?.local ?? null;
    };
    languages = (userModel: User, value: string[]) => {
        let languages;
        if (value) {
            languages = value.map(language => Language.byCode(language)?.local).join(',');
        } else {
            languages = null;
        }
        const prefix = userModel.isParent ? 'pref_' : '';
        userModel.customUser[`${prefix}languages`] = languages;
    };
    skills = (userModel: User, value: FosterSkills[]) => {
        if (userModel.customUser.fosterProperties) {
            userModel.customUser.fosterProperties.skills = value?.length > 0 ? value : null;
        }
    };
    traits = (userModel: User, value: FosterTraits[]) => {
        if (userModel.customUser.fosterProperties) {
            userModel.customUser.fosterProperties.traits = value?.length > 0 ? value : null;
        }
    };
    choresPreference = (userModel: User, value: FosterChores[]) => {
        userModel.customUser.parentSearchPreferences?.set('chores', value ?? null);
    };
    hourlyRatesPreference = (userModel: User, value: string[]) => {
        userModel.customUser.parentSearchPreferences?.set(
            'hourly_rates',
            value?.length > 0 ? value.map(item => item.replace('-', '_') as HourlyRate) : null,
        );
    };
    isEducated = (userModel: User, value: unknown) => {
        userModel.customUser.foster_educated = Util.boolyToInt(value) as never;
    };
    fosterLocation = (userModel: User, value: { visit: unknown; receive: unknown }) => {
        const prefix = userModel.isParent ? 'pref' : 'foster';
        if (value.visit !== undefined) {
            userModel.customUser.set(`${prefix}_visit`, Util.boolyToInt(value.visit));
        }

        if (value.receive !== undefined) {
            userModel.customUser.set(`${prefix}_receive`, Util.boolyToInt(value.receive));
        }
    };
    occupation = (userModel: User, value: string) => {
        userModel.customUser.dayjob = value;
    };
    disabled = (userModel: User, value: unknown) => {
        userModel.customUser.disabled = Util.boolyToInt(value) as never;
        userModel.customUser.disabled_by = 'user';
        userModel.customUser.disabled_timestamp = new Date();
    };
    validateAvatar = (userModel: User, value: boolean) => {
        if (!userModel.isParent && value === false) {
            userModel.customUser.avatar_warning_ignored = 1;
        }
    };
    receiveNewMessagesMail = (userModel: User, value: unknown) => {
        userModel.customUser.messages_mail = Util.boolyToInt(value) as never;
    };
    receiveMatchMail = (userModel: User, value: string) => {
        const dbValue = { never: 0, daily: 1, weekly: 2 }[value];
        userModel.customUser.automatch_mail = dbValue ?? null;
    };
    hasPublicProfile = (userModel: User, value: unknown) => {
        userModel.customUser.private_only = Util.boolyToInt(value) ? 0 : 1;
    };
    shareProfileWithPartners = (userModel: User, value: unknown) => {
        userModel.customUser.share_information = Util.boolyToInt(value) as never;
    };
    lookingForBabysitters = (userModel: User, value: unknown) => {
        userModel.customUser.pref_babysitter = Util.boolyToInt(value) as never;
    };
    lookingForChildminders = (userModel: User, value: unknown) => {
        userModel.customUser.pref_childminder = Util.boolyToInt(value) as never;
    };
    lookingForOccasionalCare = (userModel: User, value: unknown) => {
        userModel.customUser.pref_occasional = Util.boolyToInt(value) as never;
    };
    lookingForRegularCare = (userModel: User, value: unknown) => {
        userModel.customUser.pref_regular = Util.boolyToInt(value) as never;
    };
    lookingForRemoteTutor = (userModel: User, value: unknown) => {
        userModel.customUser.pref_remote_tutor = Util.boolyToInt(value) as never;
    };
    lookingForAfterSchool = (userModel: User, value: unknown) => {
        userModel.customUser.pref_after_school = Util.boolyToInt(value) as never;
    };
    subscriptionCancelled = (userModel: User, value: number) => {
        value = Util.boolyToInt(value);
        userModel.customUser.subscription_cancelled = value as never;

        if (value) {
            CommonEmailsService.sendPaymentCancellation(userModel);
            userModel.customUser.subscription_cancellation_date = new Date();
            userModel.customUser.discount_percentage = 0;
        }
    };
    negativeFeedbackAccepted = (userModel: User, value: unknown) => {
        userModel.customUser.negative_feedback_accepted = Util.boolyToInt(value) as never;
    };
    positiveFeedbackAccepted = (userModel: User, value: unknown) => {
        userModel.customUser.positive_feedback_accepted = Util.boolyToInt(value) as never;
    };
    disabledSafetyMessages = (userModel: User, value: unknown) => {
        userModel.customUser.disabled_safety_messages = Util.boolyToInt(value) as never;
    };
    invisible = (userModel: User, value: unknown) => {
        userModel.customUser.invisible = Util.boolyToInt(value) as never;
    };
    role = (userModel: User, value: WebRoleName) => {
        userModel.webrole_id = roleNameToRoleId(value);
    };
    testPremium = (userModel: User) => {
        userModel.customUser.premium = new Date();
    };

    static updateAvailability = (
        userModel: User,
        availability: SearchAvailability,
        prefix: 'pref' | 'foster',
        resetPreviousValues?: boolean,
    ) => {
        const originalAvailability = DateUtil.weekDays.map(item => userModel.customUser[`${prefix}_${item}`]).join('_');

        if (resetPreviousValues) {
            for (const weekDay of DateUtil.weekDays) {
                userModel.customUser.set(`${prefix}_${weekDay}`, '');
            }
        }
        const availabilityFormatted = UserCustomSetters.formatAvailability(availability);
        for (const day of availabilityFormatted) {
            userModel.customUser.set(`${prefix}_${day.key}`, day.value);
        }

        const newAvailability = DateUtil.weekDays.map(item => userModel.customUser[`${prefix}_${item}`]).join('_');
        if (originalAvailability !== newAvailability) {
            userModel.customUser.set('availability_updated', new Date());
        }
    };

    private static formatAvailability = (availability: SearchAvailability) => {
        const ret = [];
        const dayPartMappings = {
            morning: '1',
            afternoon: '2',
            evening: '3',
        };
        for (const weekDay of Util.keysOf(availability)) {
            const weekDayValues = [];
            for (const dayPart of Util.keysOf(availability[weekDay] ?? {})) {
                const dayPartValue = availability[weekDay]?.[dayPart];
                if (dayPartValue) {
                    weekDayValues.push(dayPartMappings[dayPart]);
                }
            }
            ret.push({
                key: weekDay,
                value: weekDayValues.sort((a, b) => a.localeCompare(b)).join(','),
            });
        }
        return ret;
    };
}
