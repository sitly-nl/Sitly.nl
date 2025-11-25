import { Availability, DayAvailabilityInterface } from '../models/serialize/user-response';
import { add, getUnixTime, parseISO, startOfDay, sub } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

export class DateUtil {
    static readonly weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as (keyof Availability)[];
    static readonly dayParts = ['morning', 'afternoon', 'evening'] as (keyof DayAvailabilityInterface)[];

    static isoStringToTimestamp(isoString: string) {
        return getUnixTime(parseISO(isoString));
    }

    static dateToTimestamp(date: Date) {
        return date ? Math.floor(date.getTime() / 1000) : date;
    }

    // ---- Time units ---- //
    static isTimeUnit(value: string) {
        return /^[-+]\d+ (day|week|month|year)s?$/.test(value);
    }

    static timeUnitToIsoDate(timeUnit: string) {
        if (!this.isTimeUnit(timeUnit)) {
            throw new Error('supplied value is not a time-unit');
        }

        const matches = /^([-+])(\d+) (day|week|month|year)s?$/.exec(timeUnit) ?? [];
        return (matches?.[1] === '-' ? sub : add)(new Date(), { [matches[3] + 's']: matches[2] }).toISOString();
    }

    static formattedInterval(seconds: number) {
        return [seconds / 60 / 60, (seconds / 60) % 60, seconds % 60].map(num => String(Math.floor(num)).padStart(2, '0')).join(':');
    }

    static startOfDay(timeZone: string) {
        const startOfDayInTZ = startOfDay(utcToZonedTime(new Date(), timeZone));
        return zonedTimeToUtc(startOfDayInTZ, timeZone);
    }
}
