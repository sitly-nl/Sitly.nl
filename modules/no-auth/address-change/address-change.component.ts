import { Component, HostListener, signal, ViewChild } from '@angular/core';
import { BaseComponent } from 'app/components/base.component';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';
import { EditAddressComponent } from 'modules/edit-address/edit-address.component';

@Component({
    selector: 'address-change',
    templateUrl: './address-change.component.html',
    styleUrls: ['./address-change.component.less'],
    standalone: true,
    imports: [SharedModule, TranslateModule, EditAddressComponent],
})
export default class AddressChangeComponent extends BaseComponent {
    @ViewChild(EditAddressComponent) editAddressComponent?: EditAddressComponent;

    get title() {
        if (this.editAddressComponent?.showMap) {
            return 'address-change.verifyYourAddress';
        } else {
            return this.authUser?.latitude && this.authUser?.longitude
                ? 'address-change.changeYourAddress'
                : 'address-change.weCouldNotFindYourAddress';
        }
    }

    readonly loading = signal(false);

    @HostListener('document:keydown.escape', ['$event']) onKeydownHandler(_event: KeyboardEvent) {
        this.back();
    }

    onAddressChanged() {
        this.storageService.lastMapCameraPosition = undefined;
        this.navigationService.back(this.isDesktop()).then(_ => this.navigationService.reload());
    }

    saveAddress() {
        this.editAddressComponent?.saveAddress();
    }

    toAddressForm() {
        if (this.editAddressComponent) {
            this.editAddressComponent.showMap = false;
        }
    }
}
