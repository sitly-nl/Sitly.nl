import { Component } from '@angular/core';
import { YearsExperience } from 'app/models/api/user';
import { RegistrationBaseComponent } from 'registration/components/registration-base.component';
import { SharedModule } from 'modules/shared/shared.module';
import { RegistrationPageContainerComponent } from 'registration/components/page-container/registration-page-container.component';

@Component({
    selector: 'registration-experience-years',
    templateUrl: './registration-experience-years.component.html',
    styleUrls: ['./registration-experience-years.component.less'],
    standalone: true,
    imports: [RegistrationPageContainerComponent, SharedModule],
})
export class RegistrationExperienceYearsComponent extends RegistrationBaseComponent {
    options = Object.values(YearsExperience);

    saveOption(value: YearsExperience) {
        this.authUser.fosterProperties.yearsOfExperience = value;
        this.userService
            .saveUser({
                yearsOfExperience: value,
            })
            .subscribe();
        this.registrationService.updateSteps();
        this.handleNextClick();
    }
}
