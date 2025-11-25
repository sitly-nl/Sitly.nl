import { Component } from '@angular/core';
import { RegistrationBaseComponent } from 'registration/components/registration-base.component';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';
import { RegistrationPageContainerComponent } from 'registration/components/page-container/registration-page-container.component';

@Component({
    selector: 'registration-children-amount',
    templateUrl: './registration-children-amount.component.html',
    styleUrls: ['./registration-children-amount.component.less'],
    standalone: true,
    imports: [RegistrationPageContainerComponent, SharedModule, TranslateModule],
})
export class RegistrationChildrenAmountComponent extends RegistrationBaseComponent {
    save(count: number) {
        this.userService
            .saveUser({
                maxChildren: count,
            })
            .subscribe();
        super.handleNextClick();
    }
}
