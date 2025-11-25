import { Component } from '@angular/core';
import { ProfileBlockComponent } from 'app/components/user/profile/common/profile-block/profile-block.component';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';
import { AvailabilityComponent } from 'app/components/common/availability/availability.component';

@Component({
    selector: 'profile-availability',
    templateUrl: './profile-availability.component.html',
    styleUrls: ['./profile-availability.component.less'],
    standalone: true,
    imports: [SharedModule, AvailabilityComponent, TranslateModule],
})
export class ProfileAvailabilityComponent extends ProfileBlockComponent {
    get careTypeLabelCode() {
        if (this.user.showAvailabilityDays) {
            return '';
        }

        if (this.user.isAvailableOccasionally && this.user.isAvailableAfterSchool) {
            return 'occasionalAndAfterschool';
        } else if (this.user.isAvailableOccasionally) {
            return 'occasional';
        } else {
            return 'afterschool';
        }
    }
}
