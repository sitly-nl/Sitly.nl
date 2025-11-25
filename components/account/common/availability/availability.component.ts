import { AvailabilityUtils } from 'app/utils/availability-utils';
import { Component, Input } from '@angular/core';
import { User } from 'app/models/api/user';
import { TranslateModule } from '@ngx-translate/core';
import { FormatDistanceToNowPipeModule } from 'ngx-date-fns';
import { SharedModule } from 'modules/shared/shared.module';

export enum AvailabilityTextSize {
    normal = 'normal',
    small = 'small',
}

@Component({
    selector: 'availability',
    templateUrl: './availability.component.html',
    styleUrls: ['./availability.component.base.less'],
    standalone: true,
    imports: [SharedModule, FormatDistanceToNowPipeModule, TranslateModule],
})
export class AvailabilityComponent {
    @Input({ required: true }) user: User;
    @Input() showAdditionalAvailability = true;
    @Input() textSize = AvailabilityTextSize.normal;

    AvailabilityTextSize = AvailabilityTextSize;
    AvailabilityUtils = AvailabilityUtils;

    get availability() {
        return this.user.isParent ? this.user.searchPreferences.availability : this.user.fosterProperties.availability;
    }

    get showAvailableFrom() {
        if (this.user.fosterProperties?.availableFromDate) {
            return new Date(this.user.fosterProperties.availableFromDate) > new Date();
        }
        return false;
    }

    get hideAvailabilityCalendar() {
        return (
            this.user.isParent &&
            AvailabilityUtils.hasEmptyCalendar(this.user) &&
            !this.user.isAvailableAfterSchool &&
            this.user.isAvailableOccasionally
        );
    }

    get hasFosterLocation() {
        if (this.user.isChildminder) {
            return this.user.fosterProperties?.fosterLocation?.visit || this.user.fosterProperties?.fosterLocation?.receive;
        } else if (this.user.isParent) {
            return this.user.searchPreferences?.fosterLocation?.visit || this.user.searchPreferences?.fosterLocation?.receive;
        } else {
            return false;
        }
    }
}
