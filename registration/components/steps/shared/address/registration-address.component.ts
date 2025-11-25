import { Component, ViewChild } from '@angular/core';
import { EditAddressComponent } from 'modules/edit-address/edit-address.component';
import { RegistrationBaseComponent } from 'registration/components/registration-base.component';
import { SharedModule } from 'modules/shared/shared.module';
import { RegistrationPageContainerComponent } from 'registration/components/page-container/registration-page-container.component';

@Component({
    selector: 'registration-address',
    templateUrl: './registration-address.component.html',
    styleUrls: ['./registration-address.component.less'],
    standalone: true,
    imports: [RegistrationPageContainerComponent, EditAddressComponent, SharedModule],
})
export class RegistrationAddressComponent extends RegistrationBaseComponent {
    @ViewChild(EditAddressComponent) editAddressComponent: EditAddressComponent;

    ngOnInit() {
        this.showToastWithDefaultDelay();
    }

    handleNextClick() {
        this.editAddressComponent.saveAddress();
    }

    handleBackClick() {
        if (this.editAddressComponent.showMap) {
            this.editAddressComponent.showMap = false;
        } else {
            super.handleBackClick();
        }
    }

    onAddressSaved() {
        this.registrationService.showNextStep();
    }
}
