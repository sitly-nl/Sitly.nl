import { Component } from '@angular/core';
import { FosterSkill, FosterTrait } from 'app/models/api/user';
import { RegistrationBaseComponent } from 'registration/components/registration-base.component';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';
import { RegistrationPageContainerComponent } from 'registration/components/page-container/registration-page-container.component';

@Component({
    selector: 'registration-foster-traits',
    templateUrl: './registration-foster-traits.component.html',
    styleUrls: ['./registration-foster-traits.component.less'],
    standalone: true,
    imports: [RegistrationPageContainerComponent, SharedModule, TranslateModule],
})
export class RegistrationFosterTraitsComponent extends RegistrationBaseComponent {
    skillsOptions = Object.values(FosterSkill).map(value => {
        return {
            value,
            selected: this.authUser.fosterProperties?.skills?.some(item => item === value),
        };
    });
    traitsOptions = Object.values(FosterTrait).map(value => {
        return {
            value,
            selected: this.authUser.fosterProperties?.traits?.some(item => item === value),
        };
    });

    get selectedTraits() {
        return this.traitsOptions.filter(item => item.selected);
    }

    showTraitsError = false;

    handleNextClick() {
        if (this.selectedTraits.length === 0) {
            this.showTraitsError = true;
        } else {
            this.userService
                .saveUser({
                    skills: this.skillsOptions.filter(item => item.selected).map(item => item.value),
                    traits: this.selectedTraits.map(item => item.value),
                })
                .subscribe();
            super.handleNextClick();
        }
    }
}
