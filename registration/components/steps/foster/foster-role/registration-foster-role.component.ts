import { Component } from '@angular/core';
import { UserRole } from 'app/models/api/user';
import { RegistrationBaseComponent } from 'registration/components/registration-base.component';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';
import { RegistrationPageContainerComponent } from 'registration/components/page-container/registration-page-container.component';

@Component({
    selector: 'registration-foster-role',
    templateUrl: './registration-foster-role.component.html',
    styleUrls: ['./registration-foster-role.component.less'],
    standalone: true,
    imports: [RegistrationPageContainerComponent, SharedModule, TranslateModule],
})
export class RegistrationFosterRoleComponent extends RegistrationBaseComponent {
    selectBabysitter() {
        this.selectRole(UserRole.babysitter);
    }

    selectChildminder() {
        this.selectRole(UserRole.childminder);
    }

    private selectRole(role: UserRole) {
        this.authUser.role = role;
        this.userService.saveUser({ role }).subscribe();
        this.handleNextClick();
    }
}
