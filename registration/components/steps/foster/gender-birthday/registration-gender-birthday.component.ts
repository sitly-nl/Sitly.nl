import { Component } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Gender } from 'app/models/api/user';
import { add, sub } from 'date-fns';
import { RegistrationBaseComponent } from 'registration/components/registration-base.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatDatepickerInput, MatDatepickerToggle, MatDatepicker } from '@angular/material/datepicker';
import { MatInput } from '@angular/material/input';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { SharedModule } from 'modules/shared/shared.module';
import { MatButtonToggleGroup, MatButtonToggle } from '@angular/material/button-toggle';
import { RegistrationPageContainerComponent } from 'registration/components/page-container/registration-page-container.component';
import { DateInputDirective } from 'registration/directives/date-input.directive';

@Component({
    selector: 'registration-gender-birthday',
    templateUrl: './registration-gender-birthday.component.html',
    styleUrls: ['./registration-gender-birthday.component.less'],
    standalone: true,
    imports: [
        RegistrationPageContainerComponent,
        MatButtonToggleGroup,
        FormsModule,
        MatButtonToggle,
        SharedModule,
        MatFormField,
        MatLabel,
        MatInput,
        MatDatepickerInput,
        ReactiveFormsModule,
        MatDatepickerToggle,
        MatSuffix,
        MatDatepicker,
        TranslateModule,
        DateInputDirective,
    ],
})
export class RegistrationGenderBirthdayComponent extends RegistrationBaseComponent {
    gender = this.authUser.gender ?? Gender.female;
    minAge = this.authUser.isChildminder ? this.countrySettings.childminderMinAge : this.countrySettings.babysitterMinAge;
    maxAge = 99;
    minDate = add(sub(new Date(), { years: this.maxAge + 1 }), { days: 1 });
    maxDate = sub(new Date(), { years: this.minAge });
    birthdateControl = new FormControl<Date | null>(this.authUser.birthdate ? new Date(this.authUser.birthdate) : null, {
        updateOn: 'blur',
    });
    Gender = Gender;

    ngOnInit() {
        this.showToastWithDefaultDelay();
    }

    handleNextClick() {
        if (!this.birthdateControl.value) {
            return this.birthdateControl.setErrors({ required: true });
        } else if (this.birthdateControl.value < this.minDate) {
            return this.birthdateControl.setErrors({ matDatepickerMin: true });
        } else if (this.birthdateControl.value > this.maxDate) {
            return this.birthdateControl.setErrors({ matDatepickerMax: true });
        }

        this.userService
            .saveUser({
                gender: this.gender,
                birthdate: this.birthdateControl.value?.toISOString(),
            })
            .subscribe();
        super.handleNextClick();
    }
}
