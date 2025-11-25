import { Component } from '@angular/core';
import { AgeGroup } from 'app/models/api/user';
import { RegistrationBaseComponent } from 'registration/components/registration-base.component';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';
import { RegistrationPageContainerComponent } from 'registration/components/page-container/registration-page-container.component';

@Component({
    selector: 'registration-experience-age-groups',
    templateUrl: './registration-experience-age-groups.component.html',
    styleUrls: ['./registration-experience-age-groups.component.less'],
    standalone: true,
    imports: [RegistrationPageContainerComponent, SharedModule, TranslateModule],
})
export class RegistrationExperienceAgeGroupsComponent extends RegistrationBaseComponent {
    showError = false;

    options = Object.values(AgeGroup).map(item => {
        return { value: item, selected: this.authUser.fosterProperties.ageGroupExperience?.[item] ?? false };
    });

    handleNextClick() {
        if (this.options.every(item => !item.selected)) {
            this.showError = true;
            return;
        }

        this.userService
            .saveUser({
                ageGroupExperience: this.options.reduce(
                    (acc, cur) => {
                        acc[cur.value] = cur.selected;
                        return acc;
                    },
                    {} as Record<AgeGroup, boolean>,
                ),
            })
            .subscribe();
        super.handleNextClick();
    }
}
