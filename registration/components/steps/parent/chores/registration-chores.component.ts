import { Component } from '@angular/core';
import { allFosterChores } from 'app/models/api/user';
import { RegistrationBaseComponent } from 'registration/components/registration-base.component';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';
import { RegistrationPageContainerComponent } from 'registration/components/page-container/registration-page-container.component';

@Component({
    selector: 'registration-chores',
    templateUrl: './registration-chores.component.html',
    styleUrls: ['./registration-chores.component.less'],
    standalone: true,
    imports: [RegistrationPageContainerComponent, SharedModule, TranslateModule],
})
export class RegistrationChoresComponent extends RegistrationBaseComponent {
    chores = allFosterChores.map(chore => {
        return {
            value: chore,
            selected: this.authUser?.searchPreferences?.chores?.some(item => item === chore) ?? false,
        };
    });

    handleNextClick() {
        this.userService
            .saveUser({
                choresPreference: this.chores.filter(item => item.selected).map(item => item.value),
            })
            .subscribe();
        super.handleNextClick();
    }
}
