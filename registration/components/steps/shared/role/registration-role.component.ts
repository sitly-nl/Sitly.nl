import { Component } from '@angular/core';
import { RegistrationBaseComponent } from 'registration/components/registration-base.component';
import { SharedModule } from 'modules/shared/shared.module';
import { RegistrationPageContainerComponent } from 'registration/components/page-container/registration-page-container.component';

@Component({
    selector: 'registration-role',
    templateUrl: './registration-role.component.html',
    styleUrls: ['./registration-role.component.less'],
    standalone: true,
    imports: [RegistrationPageContainerComponent, SharedModule],
})
export class RegistrationRoleComponent extends RegistrationBaseComponent {}
