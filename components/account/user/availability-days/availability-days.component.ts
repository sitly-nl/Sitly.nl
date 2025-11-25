import { Component, Input } from '@angular/core';
import { AvailabilityUtils } from 'app/utils/availability-utils';
import { User } from 'app/models/api/user';
import { TranslateModule } from '@ngx-translate/core';
import { TitleCasePipe } from '@angular/common';

enum AvailabilityDaysSize {
    small = 'small',
    medium = 'medium',
}

@Component({
    selector: 'availability-days',
    templateUrl: './availability-days.component.html',
    styleUrls: ['./availability-days.component.less'],
    standalone: true,
    imports: [TitleCasePipe, TranslateModule],
})
export class AvailabilityDaysComponent {
    @Input({ required: true }) user: User;
    @Input() size = AvailabilityDaysSize.medium;
    AvailabilityUtils = AvailabilityUtils;
    AvailabilityDaysSize = AvailabilityDaysSize;

    get weekDaysCheck() {
        return AvailabilityUtils.getWeekDaysCheck(this.user);
    }
}
