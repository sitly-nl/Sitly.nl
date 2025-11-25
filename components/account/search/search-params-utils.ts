import { AvailabilityUtils } from 'app/utils/availability-utils';
import { UserRole } from 'app/models/api/user';
import { LastSeenOnline } from 'app/components/search/search-params-options';
import { SearchParams, SearchType } from 'app/components/search/search-params';
import { sub } from 'date-fns';

export class SearchParamsUtils {
    static getFormattedHourlyRates(searchParams: SearchParams) {
        if (searchParams.hourlyRates) {
            const rates: Record<number, string> = {};
            let i = 0;
            for (const value of Object.keys(searchParams.hourlyRates)) {
                if (!searchParams.hourlyRates[value]) {
                    continue;
                }
                rates[i++] = value;
            }
            return rates;
        }
        return undefined;
    }

    static getFormattedGender(searchParams: SearchParams) {
        if (searchParams.genders.m !== searchParams.genders.f) {
            return searchParams.genders.m ? 'm' : 'f';
        }
        return null;
    }

    static getFormattedFosterLocation(searchParams: SearchParams) {
        if (searchParams.role !== UserRole.childminder) {
            return null;
        }

        if (SearchParamsUtils.isAllNegative(searchParams.fosterLocation) || SearchParamsUtils.isAllPositive(searchParams.fosterLocation)) {
            return null;
        }

        return searchParams.fosterLocation;
    }

    static getFormattedFosterChores(searchParams: SearchParams) {
        // do not apply foster chores filter to childminders yet,
        // since we just added chores to childminders registration, so results will be limited for some time
        if (searchParams.role === UserRole.parent || searchParams.role === UserRole.childminder) {
            return null;
        }

        if (SearchParamsUtils.isAllNegative(searchParams.fosterChores)) {
            return null;
        }

        const result: Record<string, boolean> = {};
        for (const key of Object.keys(searchParams.fosterChores)) {
            if (searchParams.fosterChores[key]) {
                result[key] = true;
            }
        }

        return result;
    }

    static getMinAge(searchParams: SearchParams) {
        if (searchParams.role === UserRole.parent || !searchParams.ageGroups) {
            return undefined;
        }

        let minAge;
        for (const group of Object.keys(searchParams.ageGroups)) {
            if (searchParams.ageGroups[group]) {
                const groupMin = Number.parseInt(group.split('-+')[0], 10);

                if (!minAge || minAge > groupMin) {
                    minAge = groupMin;
                }
            }
        }
        return minAge ?? searchParams.age.min;
    }

    static getMaxAge(searchParams: SearchParams) {
        if (searchParams.role === UserRole.parent || !searchParams.ageGroups || searchParams.ageGroups['33+']) {
            return undefined;
        }

        let maxAge;
        for (const group of Object.keys(searchParams.ageGroups)) {
            if (searchParams.ageGroups[group]) {
                const groupMax = Number.parseInt(group.split('-')[1], 10);

                if (!maxAge || maxAge < groupMax) {
                    maxAge = groupMax;
                }
            }
        }
        maxAge = maxAge ?? searchParams.age.max;
        return maxAge >= 70 ? undefined : maxAge;
    }

    static getFormattedLanguages(searchParams: SearchParams) {
        if (searchParams.languageKnowledge) {
            const languages: Record<number, string> = {};
            let i = 0;
            for (const value of Object.keys(searchParams.languageKnowledge)) {
                if (!searchParams.languageKnowledge[value]) {
                    continue;
                }
                languages[i++] = value;
            }
            return languages;
        }
        return undefined;
    }

    static getFormattedAgeOfChildren(searchParams: SearchParams) {
        if (searchParams.role !== UserRole.parent) {
            return null;
        }

        return {
            min: searchParams.childrenMinAge < 0 ? 0 : searchParams.childrenMinAge,
            max: searchParams.childrenMaxAge,
        };
    }

    static getFormattedAgeGroupExperience(searchParams: SearchParams) {
        if (searchParams.role === UserRole.parent) {
            return null;
        }

        if (!searchParams.ageGroupExperienceOptions.some(item => item.value)) {
            return null;
        }

        const result: Record<string, boolean> = {};
        for (const option of searchParams.ageGroupExperienceOptions) {
            if (option.value) {
                result[option.key] = option.value;
            }
        }

        return result;
    }

    static getFormattedLastSeenOnlineValue(searchParams: SearchParams) {
        if (!searchParams.lastSeenOnline) {
            return null;
        }

        switch (searchParams.lastSeenOnline) {
            case LastSeenOnline.anytime:
                return null;
            case LastSeenOnline.today:
                return sub(new Date(), { days: 1 }).toISOString();
            case LastSeenOnline.last7days:
                return sub(new Date(), { days: 7 }).toISOString();
            case LastSeenOnline.last30days:
                return sub(new Date(), { days: 30 }).toISOString();
            default:
                return searchParams.lastSeenOnline satisfies never;
        }
    }

    static getAvailabilityValue(searchParams: SearchParams) {
        if (!searchParams.availabilityObject) {
            return null;
        }

        const result: Record<string, Record<string, unknown>> = {};
        for (const day of AvailabilityUtils.weekDayNames) {
            for (const dayPart of AvailabilityUtils.dayPartNames) {
                if (searchParams.availabilityObject?.[day]?.[dayPart] === true) {
                    if (!result[day]) {
                        result[day] = {};
                    }
                    result[day][dayPart] = true;
                }
            }
        }
        return result;
    }

    static getDistance(searchParams: SearchParams) {
        if (searchParams.maxDistance && searchParams.maxDistance !== 0 && searchParams.searchType === SearchType.photo) {
            return searchParams.maxDistance;
        }
        return undefined;
    }

    static getPage(searchParams: SearchParams) {
        switch (searchParams.searchType) {
            case SearchType.photo:
            case SearchType.photoAndMap:
                return searchParams.page;
            default:
                return undefined;
        }
    }

    static isReady(searchParams: SearchParams) {
        if (!searchParams.searchType) {
            return false;
        }

        switch (searchParams.searchType) {
            case SearchType.map:
            case SearchType.photoAndMap:
                return searchParams.bounds;
        }

        return true;
    }

    // ---- Internal ---- //
    private static isAllPositive(obj: Record<string, unknown>) {
        if (!obj) {
            return false;
        }

        for (const key of Object.keys(obj)) {
            if (!obj[key]) {
                return false;
            }
        }

        return true;
    }

    private static isAllNegative(obj: Record<string, unknown>) {
        if (!obj) {
            return false;
        }

        for (const key of Object.keys(obj)) {
            if (obj[key]) {
                return false;
            }
        }

        return true;
    }
}
