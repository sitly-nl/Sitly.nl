import { User, YearsExperience, UserRole } from 'app/models/api/user';
import { SearchParams } from 'app/components/search/search-params';
import { FilterType } from 'app/components/search/filters/search-filters-types';
import {
    UserProfileTrackingData,
    EnhancedConversionAttr,
    AttributesForProfileTracking,
    DimensionRanges,
} from 'app/services/tracking/types';
export class TrackingUtils {
    static async sha256Email(email: string) {
        const msgUint8 = new TextEncoder().encode(email.toLowerCase());
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16)?.padStart(2, '0'))?.join('') ?? '';
    }

    // eslint-disable-next-line complexity
    static getUserProfileTrackingData(profile: User, isProfilePage: boolean): Partial<UserProfileTrackingData> {
        const [parentAttributes, babysitterAttributes] = isProfilePage
            ? [AttributesForProfileTracking.profilePageParent, AttributesForProfileTracking.profilePageBabysitter]
            : [AttributesForProfileTracking.searchResultParent, AttributesForProfileTracking.searchResultBabysitter];
        const desiredAttributes = profile.role === UserRole.parent ? parentAttributes : babysitterAttributes;
        const attributes = desiredAttributes.reduce(
            (acc, curr: keyof UserProfileTrackingData) => {
                acc[curr] = true;
                return acc;
            },
            {} as { [key in keyof UserProfileTrackingData]: boolean },
        );

        const trackingData: Partial<UserProfileTrackingData> = {};
        if (attributes.profile_id) {
            trackingData.profile_id = profile.id;
        }

        if (attributes.profile_role) {
            trackingData.profile_role = profile.role;
        }

        if (attributes.profile_reg_state) {
            trackingData.profile_reg_state = profile.isPremium ? 'premium' : 'registered';
        }

        if (attributes.profile_ratings_count) {
            trackingData.profile_ratings_count = profile.isParent ? undefined : profile.recommendations?.length || 0;
        }

        if (attributes.profile_rating_score) {
            trackingData.profile_rating_score = profile.isParent ? undefined : profile.averageRecommendationScore || 0;
        }

        if (attributes.profile_online_status) {
            trackingData.profile_online_status = profile.onlineStatus;
        }

        if (attributes.profile_has_avatar) {
            trackingData.profile_has_avatar = !!profile.links?.avatar;
        }

        if (attributes.profile_children_count) {
            trackingData.profile_children_count = profile.isParent ? profile.children?.length || 0 : undefined;
        }

        if (attributes.profile_children_genders) {
            trackingData.profile_children_genders = profile.isParent
                ? (profile.children
                      ?.map(child => child.gender)
                      .sort((a, b) => a.localeCompare(b))
                      .join(',') ?? 'NA')
                : undefined;
        }

        if (attributes.profile_about_length) {
            trackingData.profile_about_length = profile.about?.length ?? 0;
        }

        if (attributes.profile_photos_count) {
            trackingData.profile_photos_count = profile.totalNumberOfPhotos;
        }

        if (attributes.profile_distance) {
            trackingData.profile_distance = profile.meta.distance.kilometers ?? -1;
        }

        if (attributes.profile_years_of_experience) {
            const profileExperience =
                profile.fosterProperties?.yearsOfExperience === YearsExperience.moreThanFive
                    ? 99
                    : parseInt((profile.fosterProperties?.yearsOfExperience as string) ?? 0, 10);
            trackingData.profile_years_of_experience = profileExperience;
        }

        if (attributes.profile_has_references) {
            trackingData.profile_has_references = profile.fosterProperties?.hasReferences;
        }
        if (attributes.profile_chores) {
            const chores = profile.isParent
                ? profile.searchPreferences?.chores?.sort((a, b) => a.localeCompare(b)).join(',')
                : Object.entries(profile.fosterProperties?.fosterChores)
                      .filter(([_key, value]) => value)
                      .map(([key, _value]) => key)
                      .sort((a, b) => a.localeCompare(b))
                      .join(',');

            trackingData.profile_chores = chores ?? 'NA';
        }

        if (attributes.profile_hourly_rate) {
            const hourlyRates = profile.isParent
                ? profile.searchPreferences?.hourlyRates?.sort((a, b) => a.localeCompare(b)).join(',')
                : profile.fosterProperties?.averageHourlyRate;
            trackingData.profile_hourly_rate = hourlyRates ?? 'NA';
        }

        if (attributes.profile_skills) {
            trackingData.profile_skills = profile.isParent
                ? undefined
                : (profile.fosterProperties?.skills?.sort((a, b) => a.localeCompare(b)).join(',') ?? 'NA');
        }

        if (attributes.profile_traits) {
            trackingData.profile_traits = profile.isParent
                ? undefined
                : (profile.fosterProperties?.traits?.sort((a, b) => a.localeCompare(b)).join(',') ?? 'NA');
        }

        if (attributes.profile_languages) {
            const languages = profile.isParent
                ? profile.searchPreferences?.languages?.map(lang => lang.code)
                : profile.fosterProperties?.languages?.map(lang => lang.code);
            trackingData.profile_languages = languages?.length ? languages?.sort((a, b) => a.localeCompare(b)).join(',') : 'NA';
        }

        if (attributes.profile_join_date) {
            const createdDate = new Date(profile.created);
            trackingData.profile_join_date = `${createdDate.getMonth() + 1}/${createdDate.getFullYear()}`;
        }

        if (attributes.profile_availability_days) {
            const availability = profile.isParent ? profile.searchPreferences?.availability : profile.fosterProperties?.availability;
            const availabilityDays = Object.entries(availability)
                .filter(([_day, dayObj]) => Object.values(dayObj).some(dayPart => dayPart))
                .map(([day, _dayObj]) => day)
                .join(',');
            trackingData.profile_availability_days = availabilityDays;
        }

        if (attributes.profile_availability) {
            const isRegular = !!(profile.isParent
                ? profile.searchPreferences?.regularCare
                : profile.fosterProperties?.isAvailableRegularly);
            const isOccasional = !!(profile.isParent
                ? profile.searchPreferences?.occasionalCare
                : profile.fosterProperties?.isAvailableOccasionally);
            const isAfterSchool = !!(profile.isParent
                ? profile.searchPreferences?.afterSchool
                : profile.fosterProperties?.isAvailableAfterSchool);
            const availabilityString = `
                ${isRegular ? 'regular,' : ''}
                ${isOccasional ? 'occasional,' : ''}
                ${isAfterSchool ? 'after-school,' : ''}
            `;
            trackingData.profile_availability = availabilityString;
        }

        if (attributes.profile_gender) {
            trackingData.profile_gender = profile.gender;
        }

        return trackingData;
    }

    // eslint-disable-next-line complexity
    static getActiveFiltersMap(searchParams: SearchParams, authUser: User) {
        const {
            options,
            maxDistance,
            hasRegularCare,
            hasOccasionalCare,
            hasAfterSchool,
            lastSeenOnline,
            hourlyRates,
            hasReferences,
            isEducated,
            ageGroupExperienceOptions,
            genders,
            age,
            nativeLanguage,
            languageKnowledge,
            fosterChores,
            isNonSmoker,
            availabilityObject,
            role,
            fosterLocation,
            childrenAmount,
            childrenMaxAge,
            childrenMinAge,
        } = searchParams;

        const activeFilters = new Map<FilterType, string | number | boolean>();

        if (hasRegularCare || hasOccasionalCare || hasAfterSchool) {
            const careTypeValue = [];
            careTypeValue.push(hasRegularCare ? 'regular' : null);
            careTypeValue.push(hasOccasionalCare ? 'occasional' : null);
            careTypeValue.push(hasAfterSchool ? 'afterSchool' : null);
            activeFilters.set(
                FilterType.careType,
                careTypeValue
                    .filter(x => x !== null)
                    .sort((a, b) => a.localeCompare(b))
                    .join(','),
            );
        }

        if (lastSeenOnline !== searchParams.defaultLastSeenOnline) {
            activeFilters.set(FilterType.lastOnline, lastSeenOnline);
        }

        if (maxDistance) {
            activeFilters.set(FilterType.maxDistance, maxDistance);
        }

        const availabilityString = Object.entries(availabilityObject)
            .filter(([_day, dayObj]) => Object.values(dayObj).some(status => status))
            .map(([day, _dayObj]) => day)
            .join(',');
        if (availabilityString) {
            activeFilters.set(FilterType.availability, availabilityString);
        }

        if (authUser.isParent) {
            if (nativeLanguage) {
                activeFilters.set(FilterType.nativeLanguage, nativeLanguage);
            }

            if (isNonSmoker) {
                activeFilters.set(FilterType.nonSmoker, isNonSmoker);
            }

            if (age.max !== options.babysitterAge.max || age.min !== options.babysitterAge.min) {
                activeFilters.set(FilterType.age, `${age.min}-${age.max}`);
            }
            const hourlyRateString = Object.entries(hourlyRates)
                .filter(([_, isSet]) => isSet)
                .map(([rate, _]) => rate)
                .join(',');
            if (hourlyRateString) {
                activeFilters.set(FilterType.hourlyRate, hourlyRateString);
            }

            const ageGroupExperienceString = Object.values(ageGroupExperienceOptions)
                .filter(ageObj => ageObj.value)
                .map(ageObj => ageObj.key)
                .join(',');
            if (ageGroupExperienceString) {
                activeFilters.set(FilterType.ageGroups, ageGroupExperienceString);
            }
            const languageString = Object.entries(languageKnowledge)
                .filter(([_, isSet]) => isSet)
                .map(([lang, _]) => lang)
                .sort((a, b) => a.localeCompare(b))
                .join(',');
            if (languageString) {
                activeFilters.set(FilterType.languages, languageString);
            }
            const genderString = Object.entries(genders)
                .filter(([_, isSet]) => isSet)
                .map(([gender, _]) => gender)
                .sort((a, b) => a.localeCompare(b))
                .join(',');
            if (genderString) {
                activeFilters.set(FilterType.gender, genderString);
            }

            if (role === UserRole.babysitter) {
                const choresString = Object.entries(fosterChores)
                    .filter(([_, isSet]) => isSet)
                    .map(([chore, _]) => chore)
                    .sort((a, b) => a.localeCompare(b))
                    .join(',');
                if (choresString) {
                    activeFilters.set(FilterType.chores, choresString);
                }
                if (hasReferences) {
                    activeFilters.set(FilterType.resume, 'references');
                }
            } else if (role === UserRole.childminder) {
                if (hasAfterSchool) {
                    activeFilters.set(FilterType.careType, 'afterSchool');
                }
                if (fosterLocation.receive || fosterLocation.visit) {
                    const locationValue = [];
                    locationValue.push(fosterLocation.receive ? 'recieve' : null);
                    locationValue.push(fosterLocation.visit ? 'visit' : null);
                    activeFilters.set(
                        FilterType.resume,
                        locationValue
                            .filter(x => x !== null)
                            .sort((a, b) => a.localeCompare(b))
                            .join(','),
                    );
                }
                if (isEducated || hasReferences) {
                    const resumeValue = [];
                    resumeValue.push(isEducated ? 'educated' : null);
                    resumeValue.push(hasReferences ? 'references' : null);
                    activeFilters.set(
                        FilterType.resume,
                        resumeValue
                            .filter(x => x !== null)
                            .sort((a, b) => a.localeCompare(b))
                            .join(','),
                    );
                }
            }
        } else if (!authUser.isParent) {
            if (childrenAmount) {
                activeFilters.set(FilterType.maxNumberOfChildren, childrenAmount);
            }

            if (childrenMaxAge !== options.childrenAge.max || childrenMinAge !== options.childrenAge.min) {
                activeFilters.set(FilterType.childrenMaxAge, childrenMaxAge);
            }

            if (hasRegularCare || hasOccasionalCare || hasAfterSchool) {
                const careTypeValue = [];
                careTypeValue.push(hasRegularCare ? 'regular' : null);
                careTypeValue.push(hasOccasionalCare ? 'occasional' : null);
                careTypeValue.push(hasAfterSchool ? 'afterSchool' : null);
                activeFilters.set(
                    FilterType.careType,
                    careTypeValue
                        .filter(x => x !== null)
                        .sort((a, b) => a.localeCompare(b))
                        .join(','),
                );
            }
        }

        return activeFilters;
    }

    static addEnhancedConversionData({ email, firstName, lastName, street, city, country }: EnhancedConversionAttr) {
        window.__sitly_enhanced_convestion_tracking = {
            email: email ?? undefined,
            address: {
                first_name: firstName ?? undefined,
                last_name: lastName ?? undefined,
                street: street ?? undefined,
                city: city ?? undefined,
                country: country ?? undefined,
            },
        };
    }

    static roundNumberByScale(number: number, scale: DimensionRanges[]) {
        for (const range of scale) {
            if (range.includes('+') && number >= parseInt(range.replace('+', ''), 10)) {
                return range;
            }
            const [low, high] = range.split('-').map(n => parseInt(n.replace('+', ''), 10));
            if (number === low || (number >= low && number <= high)) {
                return range;
            }
        }
        return `~${number}`;
    }
}
