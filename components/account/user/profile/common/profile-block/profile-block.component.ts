import { Input, Component, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BaseComponent } from 'app/components/base.component';
import { User } from 'app/models/api/user';

@Component({
    template: '',
})
export abstract class ProfileBlockComponent extends BaseComponent {
    readonly translateService = inject(TranslateService);
    get ownProfile() {
        return this.user?.id === this.userService.authUser?.id;
    }

    @Input({ required: true }) user: User;
}
