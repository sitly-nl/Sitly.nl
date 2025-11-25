import { Component } from '@angular/core';
import { FormControl, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Error } from 'app/services/api/api.service';
import { RegistrationBaseComponent } from 'registration/components/registration-base.component';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';
import { MatInput } from '@angular/material/input';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { RegistrationPageContainerComponent } from 'registration/components/page-container/registration-page-container.component';

@Component({
    selector: 'registration-email',
    templateUrl: './registration-email.component.html',
    styleUrls: ['./registration-email.component.less'],
    standalone: true,
    imports: [
        RegistrationPageContainerComponent,
        MatFormField,
        MatLabel,
        MatInput,
        FormsModule,
        ReactiveFormsModule,
        SharedModule,
        TranslateModule,
    ],
})
export class RegistrationEmailComponent extends RegistrationBaseComponent {
    email = new FormControl(this.authUser?.email, {
        validators: [Validators.email],
        updateOn: 'blur',
    });
    focused = false;

    handleNextClick() {
        if (!this.email.value) {
            this.email.setErrors({ email: true });
        }

        if (this.email.invalid) {
            return;
        }

        this.userService
            .saveUser({
                email: this.email.value ?? '',
            })
            .subscribe(
                _ => {
                    super.handleNextClick();
                },
                (error: Error<{ title: string }>) => {
                    this.email.setErrors({ duplicate: error.error?.errors?.[0].title });
                    this.cd.markForCheck();
                },
            );
    }
}
