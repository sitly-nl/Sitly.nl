import { UserDayAvailabilityInterface, UserAvailabilityInterface, User } from 'app/models/api/user';
import { Util } from 'app/utils/utils';

export enum DayPart {
    morning = 'morning',
    afternoon = 'afternoon',
    evening = 'evening',
}

export enum WeekDay {
    monday = 'monday',
    tuesday = 'tuesday',
    wednesday = 'wednesday',
    thursday = 'thursday',
    friday = 'friday',
    saturday = 'saturday',
    sunday = 'sunday',
}

export class AvailabilityUtils {
    static readonly dayParts = [
        { id: 1, name: DayPart.morning, label: 'main.morning' },
        { id: 2, name: DayPart.afternoon, label: 'main.afternoon' },
        { id: 3, name: DayPart.evening, label: 'main.evening' },
    ];

    static readonly weekDays = [
        { name: WeekDay.monday, label: 'main.monday', labelShort: 'main.mondayShort', labelShortStandard: 'main.mondayShortStandard' },
        { name: WeekDay.tuesday, label: 'main.tuesday', labelShort: 'main.tuesdayShort', labelShortStandard: 'main.tuesdayShortStandard' },
        {
            name: WeekDay.wednesday,
            label: 'main.wednesday',
            labelShort: 'main.wednesdayShort',
            labelShortStandard: 'main.wednesdayShortStandard',
        },
        {
            name: WeekDay.thursday,
            label: 'main.thursday',
            labelShort: 'main.thursdayShort',
            labelShortStandard: 'main.thursdayShortStandard',
        },
        { name: WeekDay.friday, label: 'main.friday', labelShort: 'main.fridayShort', labelShortStandard: 'main.fridayShortStandard' },
        {
            name: WeekDay.saturday,
            label: 'main.saturday',
            labelShort: 'main.saturdayShort',
            labelShortStandard: 'main.saturdayShortStandard',
        },
        { name: WeekDay.sunday, label: 'main.sunday', labelShort: 'main.sundayShort', labelShortStandard: 'main.sundayShortStandard' },
    ];

    static readonly weekDayNames = Object.values(WeekDay);
    static readonly dayPartNames = Object.values(DayPart);

    static isSomeDayPartChecked(dayAvailability: UserDayAvailabilityInterface) {
        if (!dayAvailability) {
            return false;
        }

        for (const dayPart of Util.keysOf(dayAvailability)) {
            if (dayAvailability[dayPart]) {
                return true;
            }
        }
        return false;
    }

    static isWholeDayChecked(availability: UserAvailabilityInterface, day: WeekDay) {
        if (!availability) {
            return false;
        }

        const dayAvailability = availability[day];
        return AvailabilityUtils.isChecked(dayAvailability);
    }

    static toggle(dayAvailability: UserDayAvailabilityInterface) {
        if (!dayAvailability) {
            return;
        }

        const checked = !AvailabilityUtils.isChecked(dayAvailability);
        for (const dayPart of Util.keysOf(dayAvailability)) {
            dayAvailability[dayPart] = checked;
        }
    }

    static toggleWholeDay(availability: UserAvailabilityInterface, day: WeekDay) {
        AvailabilityUtils.toggle(availability[day]);
    }

    static isEmpty(availability: UserAvailabilityInterface) {
        if (!availability) {
            return true;
        }

        for (const dayName of Util.keysOf(availability)) {
            const day = availability[dayName];

            for (const dayPart of Util.keysOf(day)) {
                if (day[dayPart] === true) {
                    return false;
                }
            }
        }

        return true;
    }

    static isAvailabilityField(day: WeekDay) {
        return AvailabilityUtils.weekDayNames.includes(day);
    }

    static hasEmptyCalendar(user: User) {
        return AvailabilityUtils.isEmpty(user.availability);
    }

    static selectedDays(availability: UserAvailabilityInterface) {
        return AvailabilityUtils.weekDayNames.filter(day => {
            return AvailabilityUtils.isSomeDayPartChecked(availability[day]);
        });
    }

    static getWeekDaysCheck(user: User) {
        const weekDaysCheck: Record<string, boolean> = {};
        const userAvailability = user.availability;
        for (const day of AvailabilityUtils.weekDayNames) {
            weekDaysCheck[day] = AvailabilityUtils.isSomeDayPartChecked(userAvailability[day]);
        }
        return weekDaysCheck;
    }

    // ---- Internal ---- //
    private static isChecked(dayAvailability: UserDayAvailabilityInterface) {
        if (!dayAvailability) {
            return false;
        }

        for (const dayPart of Util.keysOf(dayAvailability)) {
            if (!dayAvailability[dayPart]) {
                return false;
            }
        }

        return true;
    }
}
