import { Component, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Country, CountryCode } from 'app/models/api/country';
import { GenericError } from 'app/services/api/api.service';
import { ValidationRules } from 'app/utils/constants';
import { takeUntil } from 'rxjs/operators';
import { BaseAuthFlowComponent } from 'modules/auth/components/base-auth-flow.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatOption } from '@angular/material/core';
import { MatSelect } from '@angular/material/select';
import { NgTemplateOutlet } from '@angular/common';
import { MatInput } from '@angular/material/input';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { SharedModule } from 'modules/shared/shared.module';
import { SocialSSOComponent } from 'modules/auth/components/social-sso/social-sso.component';
import { TermsAndPrivacyComponent } from 'modules/auth/components/terms-and-privacy/terms-and-privacy.component';

@Component({
    selector: 'sign-up',
    templateUrl: './sign-up.component.html',
    styleUrls: ['./sign-up.component.less'],
    standalone: true,
    imports: [
        SharedModule,
        SocialSSOComponent,
        FormsModule,
        MatFormField,
        MatLabel,
        MatInput,
        ReactiveFormsModule,
        MatSuffix,
        MatSelect,
        MatOption,
        TermsAndPrivacyComponent,
        NgTemplateOutlet,
        TranslateModule,
    ],
})
export class SignUpComponent extends BaseAuthFlowComponent implements OnInit {
    genericError = false;
    errors: {
        email?: 'invalidValue' | 'emailAlreadyUsed';
        firstName?: 'invalidValue';
        lastName?: 'invalidValue';
    } = {};

    signUpForm = new FormGroup({
        email: new FormControl('', {
            nonNullable: true,
            validators: [Validators.email, Validators.required],
        }),
        password: new FormControl('', {
            nonNullable: true,
            validators: [
                Validators.minLength(ValidationRules.user.password.length.min),
                Validators.maxLength(ValidationRules.user.password.length.max),
                Validators.required,
            ],
        }),
        firstName: new FormControl('', {
            nonNullable: true,
            validators: [
                Validators.minLength(ValidationRules.user.firstName.length.min),
                Validators.maxLength(ValidationRules.user.firstName.length.max),
                Validators.required,
                Validators.pattern(/^[^0-9@]+$/),
            ],
        }),
        lastName: new FormControl('', {
            nonNullable: true,
            validators: [
                Validators.minLength(ValidationRules.user.lastName.length.min),
                Validators.maxLength(ValidationRules.user.lastName.length.max),
                Validators.required,
                Validators.pattern(/^[^0-9@]+$/),
            ],
        }),
        country: new FormControl<CountryCode | undefined>(undefined, {
            nonNullable: true,
            validators: [Validators.required],
        }),
    });

    readonly emailControl = this.signUpForm.controls.email;
    readonly passwordControl = this.signUpForm.controls.password;
    readonly firstNameControl = this.signUpForm.controls.firstName;
    readonly lastNameControl = this.signUpForm.controls.lastName;
    readonly countryControl = this.signUpForm.controls.country;

    get hasEmailError() {
        return this.emailControl.invalid || !!this.errors.email;
    }
    get hasPasswordError() {
        return this.passwordControl.touched && this.passwordControl.invalid;
    }
    get hasFirstNameError() {
        return (this.firstNameControl.touched && this.firstNameControl.invalid) || !!this.errors.firstName;
    }
    get hasLastNameError() {
        return (this.lastNameControl.touched && this.lastNameControl.invalid) || !!this.errors.lastName;
    }
    get hasCountryError() {
        return this.countryControl.touched && this.countryControl.invalid;
    }

    countries: Country[] = [];

    private readonly route = inject(ActivatedRoute);

    ngOnInit() {
        this.emailControl.setValue(this.route.snapshot.queryParamMap.get('email') ?? '');
        this.emailControl.valueChanges.pipe(takeUntil(this.destroyed$)).subscribe(_ => {
            this.errors.email = undefined;
        });
        this.firstNameControl.valueChanges.pipe(takeUntil(this.destroyed$)).subscribe(_ => {
            this.errors.firstName = undefined;
        });
        this.lastNameControl.valueChanges.pipe(takeUntil(this.destroyed$)).subscribe(_ => {
            this.errors.lastName = undefined;
        });

        this.countriesApiService.countries().subscribe(res => (this.countries = res.data));
    }

    continueClicked() {
        this.genericError = false;

        Object.values(this.signUpForm.controls).forEach(control => {
            control.markAsTouched();
        });

        const countryCode = this.countryControl.value;
        if (this.signUpForm.valid && countryCode) {
            this.loading = true;
            this.userService
                .createUser(
                    {
                        email: this.emailControl.value,
                        firstName: this.firstNameControl.value,
                        lastName: this.lastNameControl.value,
                        password: this.passwordControl.value,
                    },
                    countryCode,
                )
                .subscribe(
                    res => this.onUserCreated(res.data, res.meta.accessToken, countryCode),
                    (error: GenericError) => {
                        const emailError = error.error?.errors?.find(item => item.source.parameter === 'email');
                        this.errors.email = emailError
                            ? emailError.title === 'This e-mail already exists'
                                ? 'emailAlreadyUsed'
                                : 'invalidValue'
                            : undefined;
                        this.errors.firstName = error.error?.errors?.some(item => item.source.parameter === 'firstName')
                            ? 'invalidValue'
                            : undefined;
                        this.errors.lastName = error.error?.errors?.some(item => item.source.parameter === 'lastName')
                            ? 'invalidValue'
                            : undefined;

                        this.genericError = Object.values(this.errors).every(value => !value);

                        this.loading = false;
                        this.cd.markForCheck();
                    },
                );
        }
    }
}
