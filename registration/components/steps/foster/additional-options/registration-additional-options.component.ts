import { Component } from '@angular/core';
import { allFosterChores } from 'app/models/api/user';
import { RegistrationBaseComponent } from 'registration/components/registration-base.component';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';
import { RegistrationPageContainerComponent } from 'registration/components/page-container/registration-page-container.component';

@Component({
    selector: 'registration-additional-options',
    templateUrl: './registration-additional-options.component.html',
    styleUrls: ['./registration-additional-options.component.less'],
    standalone: true,
    imports: [RegistrationPageContainerComponent, SharedModule, TranslateModule],
})
export class RegistrationAdditionalOptionsComponent extends RegistrationBaseComponent {
    chores = allFosterChores.map(chore => {
        return {
            value: chore,
            selected: this.authUser.fosterProperties?.fosterChores[chore] ?? false,
        };
    });

    handleNextClick() {
        this.userService
            .saveUser({
                isSmoker: !!this.authUser.fosterProperties.isSmoker,
                hasCar: !!this.authUser.fosterProperties.hasCar,
                hasFirstAidCertificate: !!this.authUser.fosterProperties.hasFirstAidCertificate,
                hasCertificateOfGoodBehavior: !!this.authUser.fosterProperties.hasCertificateOfGoodBehavior,
                ...(this.authUser.isBabysitter
                    ? {
                          fosterChores: this.chores.reduce(
                              (acc, cur) => {
                                  acc[cur.value] = cur.selected;
                                  return acc;
                              },
                              {} as Record<string, boolean>,
                          ),
                      }
                    : {}),
                ...(this.authUser.isChildminder
                    ? {
                          isEducated: !!this.authUser.fosterProperties.isEducated,
                      }
                    : {}),
            })
            .subscribe();
        super.handleNextClick();
    }
}
