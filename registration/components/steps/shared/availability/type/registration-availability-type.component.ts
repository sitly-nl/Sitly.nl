import { Component } from '@angular/core';
import { StandardOverlayComponent } from 'app/components/common/overlay-content/standard-overlay/standard-overlay.component';
import { RegistrationBaseComponent } from 'registration/components/registration-base.component';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';
import { RegistrationPageContainerComponent } from 'registration/components/page-container/registration-page-container.component';

@Component({
    selector: 'registration-availability-type',
    templateUrl: './registration-availability-type.component.html',
    styleUrls: ['./registration-availability-type.component.less'],
    standalone: true,
    imports: [RegistrationPageContainerComponent, SharedModule, TranslateModule],
})
export class RegistrationAvailabilityTypeComponent extends RegistrationBaseComponent {
    showError = false;

    handleNextClick() {
        if (!this.authUser.hasRegularCare && !this.authUser.isAvailableOccasionally) {
            this.showError = true;
        } else {
            this.userService
                .saveUser(
                    this.authUser.isParent
                        ? {
                              lookingForRegularCare: !!this.authUser.hasRegularCare,
                              lookingForOccasionalCare: !!this.authUser.isAvailableOccasionally,
                          }
                        : {
                              isAvailableRegularly: !!this.authUser.hasRegularCare,
                              isAvailableOccasionally: !!this.authUser.isAvailableOccasionally,
                          },
                )
                .subscribe();
            this.registrationService.updateSteps();

            const updateAfterschool = (afterSchool: boolean) => {
                this.userService
                    .saveUser({
                        [this.authUser.isParent ? 'lookingForAfterSchool' : 'isAvailableAfterSchool']: afterSchool,
                    })
                    .subscribe();
                super.handleNextClick();
            };

            this.overlayService.openOverlay(StandardOverlayComponent, {
                title: this.authUser.isParent ? 'alert.afterSchool.title.parent' : 'alert.afterSchool.title.foster',
                message: this.authUser.isParent ? 'alert.afterSchool.subtitle.parent' : 'alert.afterSchool.subtitle.foster',
                primaryBtn: { title: 'main.no', action: () => updateAfterschool(false) },
                secondaryBtn: { title: 'main.yes', action: () => updateAfterschool(true) },
                trackName: `afterSchool-${this.authUser.isParent ? 'parent' : 'foster'}`,
            });
        }
    }
}
