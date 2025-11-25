import { Component } from '@angular/core';
import { ProfileBlockComponent } from 'app/components/user/profile/common/profile-block/profile-block.component';
import { YearsExperience } from 'app/models/api/user';
import { ExperienceYearsPipe } from 'app/pipes/experience-years.pipe';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';

@Component({
    selector: 'profile-experience',
    templateUrl: './profile-experience.component.html',
    styleUrls: ['./profile-experience.component.less'],
    standalone: true,
    imports: [SharedModule, TranslateModule, ExperienceYearsPipe],
})
export class ProfileExperienceComponent extends ProfileBlockComponent {
    get hasExperience() {
        return this.user.fosterProperties?.yearsOfExperience && this.user.fosterProperties.yearsOfExperience !== YearsExperience.none;
    }

    get hasManyYearsExperience() {
        return (
            this.user.fosterProperties.yearsOfExperience &&
            this.user.fosterProperties.yearsOfExperience !== YearsExperience.none &&
            this.user.fosterProperties.yearsOfExperience !== YearsExperience.one
        );
    }
}
