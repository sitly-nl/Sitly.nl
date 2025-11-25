import { Component } from '@angular/core';
import { ProfileBlockComponent } from 'app/components/user/profile/common/profile-block/profile-block.component';
import { HourlyRatePipe } from 'app/pipes/hourly-rate.pipe';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';

@Component({
    selector: 'foster-services',
    templateUrl: './foster-services.component.html',
    styleUrls: ['./foster-services.component.less'],
    standalone: true,
    imports: [SharedModule, TranslateModule, HourlyRatePipe],
})
export class FosterServicesComponent extends ProfileBlockComponent {
    get hasFosterChores() {
        const fosterChores = this.user?.fosterProperties?.fosterChores;
        return fosterChores?.chores || fosterChores?.driving || fosterChores?.shopping || fosterChores?.cooking || this.hasHomeworkChore;
    }
    get hasNumberOfChildren() {
        return this.user?.searchPreferences?.maxChildren > 0;
    }
    get hasHomeworkChore() {
        return this.user.fosterProperties?.fosterChores?.homework || this.user?.remoteTutoring;
    }
}
