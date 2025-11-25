import { Component, inject } from '@angular/core';
import { BaseComponent } from 'app/components/base.component';
import { UserIncomplete } from 'app/models/api/user';
import { RegistrationOverlayService } from 'registration/services/registration-overlay.service';
import { RegistrationService } from 'registration/services/registration.service';

@Component({
    template: '',
})
export abstract class RegistrationBaseComponent extends BaseComponent<UserIncomplete> {
    readonly registrationService = inject(RegistrationService);
    readonly overlayService = inject(RegistrationOverlayService);

    showToast = false;

    showToastWithDefaultDelay() {
        setTimeout(() => {
            this.showToast = true;
            this.cd.markForCheck();
        }, 800);
    }

    handleNextClick() {
        this.registrationService.showNextStep();
    }

    handleBackClick() {
        this.registrationService.showPreviousStep();
    }
}
