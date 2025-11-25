import { Component } from '@angular/core';
import { RegistrationBaseComponent } from 'registration/components/registration-base.component';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';
import { RegistrationPageContainerComponent } from 'registration/components/page-container/registration-page-container.component';

@Component({
    selector: 'registration-references',
    templateUrl: './registration-references.component.html',
    styleUrls: ['./registration-references.component.less'],
    standalone: true,
    imports: [RegistrationPageContainerComponent, SharedModule, TranslateModule],
})
export class RegistrationReferencesComponent extends RegistrationBaseComponent {
    ngOnInit() {
        this.showToastWithDefaultDelay();
    }

    save(hasReferences: boolean) {
        this.userService.saveUser({ hasReferences }).subscribe();
        super.handleNextClick();
    }
}
