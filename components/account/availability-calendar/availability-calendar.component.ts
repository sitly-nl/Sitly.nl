import { BaseComponent } from 'app/components/base.component';
import { SearchParams } from 'app/components/search/search-params';
import { AvailabilityUtils, WeekDay } from 'app/utils/availability-utils';
import { UserAvailabilityInterface } from 'app/models/api/user';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Util } from 'app/utils/utils';
import { TrackLabelDirective } from 'modules/shared/directives/track-label.directive';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';
import { FormsModule } from '@angular/forms';
import { FormCheckboxComponent } from 'app/components/common/form/checkbox.component';

@Component({
    selector: 'availability-calendar',
    templateUrl: './availability-calendar.component.html',
    styleUrls: ['./availability-calendar.component.base.less'],
    standalone: true,
    imports: [FormsModule, FormCheckboxComponent, SharedModule, TranslateModule],
})
export class AvailabilityCalendarComponent extends BaseComponent {
    @Input() availability: UserAvailabilityInterface;
    @Input() searchParams?: SearchParams;
    @Input() paddedOpaque = false;
    @Input() showCalendar = true;
    @Input() additionalAvailabilityPadded = true;
    @Input({ required: true }) placement: string;

    @Output() readonly availabilityChange = new EventEmitter<UserAvailabilityInterface>();
    @Output() readonly additionalAvailabilityChanged = new EventEmitter<Event>();

    AvailabilityUtils = AvailabilityUtils;

    readonly TrackLabelDirective = TrackLabelDirective;

    get showRegularAndOccasionalCare() {
        if (this.searchParams) {
            return this.searchParams.showRegularCare;
        } else {
            return !this.authUser.isChildminder;
        }
    }
    get regularCareTitle() {
        if (this.searchParams && !this.authUser.isParent) {
            return 'filters.availability.regularCare.foster';
        }
        return this.authUser.isParent ? 'settings.needSomeoneOnRegularSchedule' : 'settings.availableRegularlyTitle';
    }
    get occasionalCareTitle() {
        if (this.searchParams && !this.authUser.isParent) {
            return 'filters.availability.occasionalCare.foster';
        }
        return this.authUser.isParent ? 'settings.needSomeoneOccasionally' : 'settings.availableOccasionallyTitle';
    }
    get afterSchoolCareTitle() {
        if (this.searchParams && !this.authUser.isParent) {
            return 'filters.availability.afterSchoolCare.foster';
        }
        return this.authUser.isParent ? 'settings.needSomeoneAfterschool' : 'settings.availableAfterSchoolCareTitle';
    }

    wholeDayChecked(day: WeekDay) {
        return AvailabilityUtils.isWholeDayChecked(this.availability, day);
    }

    inverseDayCheck(day: WeekDay) {
        const checked = AvailabilityUtils.isWholeDayChecked(this.availability, day);
        const dayAvailability = this.availability[day];
        for (const dayPart of Util.keysOf(dayAvailability)) {
            dayAvailability[dayPart] = !checked;
        }
        this.cd.detectChanges();

        this.availabilityChange.emit(this.availability);
    }

    onAvailabilityChange() {
        this.availabilityChange.emit(this.availability);
    }
}
