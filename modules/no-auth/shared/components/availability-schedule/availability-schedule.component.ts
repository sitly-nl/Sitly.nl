import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { UserAvailabilityInterface } from 'app/models/api/user';
import { AvailabilityUtils, DayPart, WeekDay } from 'app/utils/availability-utils';
import { Util } from 'app/utils/utils';

@Component({
    selector: 'availability-schedule',
    templateUrl: './availability-schedule.component.html',
    styleUrls: ['./availability-schedule.component.less'],
})
export class AvailabilityScheduleComponent {
    @Input({ required: true }) availability: UserAvailabilityInterface;
    @Input() showSelectAll = true;
    @Output() readonly availabilityChange = new EventEmitter<UserAvailabilityInterface>();

    isAvailabilityEmpty = false;
    AvailabilityUtils = AvailabilityUtils;

    get showShortDayNames() {
        return window.innerWidth < 375;
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.availability) {
            this.refreshAvailabilityEmpty();
        }
    }

    onAvailabilityChanged() {
        this.availabilityChange.emit(this.availability);
        this.refreshAvailabilityEmpty();
    }

    wholeDaySelected(day: WeekDay) {
        const dayAvailability = this.availability[day];
        return dayAvailability.morning && dayAvailability.afternoon && dayAvailability.evening;
    }

    toggleDaySelection(day: WeekDay) {
        AvailabilityUtils.toggle(this.availability[day]);
        this.onAvailabilityChanged();
    }

    selectDayPart(dayPart: DayPart) {
        Object.values(this.availability).forEach(dayAvailability => {
            dayAvailability[dayPart] = true;
        });
        this.onAvailabilityChanged();
    }

    toggleSelectAll() {
        Object.values(this.availability).forEach(dayAvailability => {
            Util.keysOf(dayAvailability).forEach(dayPart => {
                dayAvailability[dayPart] = this.isAvailabilityEmpty;
            });
        });
        this.onAvailabilityChanged();
    }

    private refreshAvailabilityEmpty() {
        this.isAvailabilityEmpty = AvailabilityUtils.isEmpty(this.availability);
    }
}
