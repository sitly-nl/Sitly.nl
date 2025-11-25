import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BaseComponent } from 'app/components/base.component';
import { User } from 'app/models/api/user';

@Component({
    template: '',
})
export class RoleProfileComponent extends BaseComponent {
    @Input({ required: true }) user: User;

    @Output() showReport = new EventEmitter();
    @Output() favorite = new EventEmitter();
    @Output() share = new EventEmitter();
    @Output() message = new EventEmitter();
    @Output() map = new EventEmitter();

    get ownProfile() {
        return this.user.id === this.authUser.id;
    }

    get showMap() {
        return this.countrySettings.showMapBackend;
    }

    get showNonResponderWarning() {
        return this.authUser.isPremium && this.user.isPotentialNonResponder;
    }

    scrollToMap() {
        const mapHeader = document.querySelector('.map-container');
        mapHeader?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}
