import { Component } from '@angular/core';
import { RegistrationBaseComponent } from 'registration/components/registration-base.component';
import { SharedModule } from 'modules/shared/shared.module';
import { RegistrationPageContainerComponent } from 'registration/components/page-container/registration-page-container.component';

@Component({
    selector: 'registration-availability-schedule',
    templateUrl: './registration-availability-schedule.component.html',
    styleUrls: ['./registration-availability-schedule.component.less'],
    standalone: true,
    imports: [RegistrationPageContainerComponent, SharedModule],
})
export class RegistrationAvailabilityScheduleComponent extends RegistrationBaseComponent {
    handleNextClick() {
        this.userService.saveUserAvailability({ availability: this.authUser.availability }).subscribe();
        super.handleNextClick();
    }
}
