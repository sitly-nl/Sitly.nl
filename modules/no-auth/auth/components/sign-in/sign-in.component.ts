import { Component, OnInit } from '@angular/core';
import { FormControl, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { finalize, pairwise, takeUntil } from 'rxjs/operators';
import { CountryPickerOverlayComponent } from 'modules/auth/components/country-picker/country-picker-overlay.component';
import { Country, CountryCode } from 'app/models/api/country';
import { AuthSubRouteType } from 'modules/auth//auth-route-type';
import { BaseAuthFlowComponent } from 'modules/auth/components/base-auth-flow.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatInput } from '@angular/material/input';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { SharedModule } from 'modules/shared/shared.module';
import { SocialSSOComponent } from 'modules/auth/components/social-sso/social-sso.component';
import { TermsAndPrivacyComponent } from 'modules/auth/components/terms-and-privacy/terms-and-privacy.component';

@Component({
    selector: 'sign-in',
    templateUrl: './sign-in.component.html',
    styleUrls: ['./sign-in.component.less'],
    standalone: true,
    imports: [
        SharedModule,
        FormsModule,
        MatFormField,
        MatLabel,
        MatInput,
        ReactiveFormsModule,
        MatSuffix,
        SocialSSOComponent,
        TermsAndPrivacyComponent,
        TranslateModule,
    ],
})
export class SignInComponent extends BaseAuthFlowComponent implements OnInit {
    AuthSubRouteType = AuthSubRouteType;

    state: { type: 'initial' } | { type: 'accountInCountries'; countries: Country[] } = { type: 'initial' };

    emailValidationFailed = false;
    failed = false;
    email = new FormControl('', {
        nonNullable: true,
        validators: [Validators.email, Validators.required],
    });
    password = new FormControl('', {
        nonNullable: true,
        validators: [Validators.minLength(1), Validators.required],
    });

    get hasEmailError() {
        return (this.email.touched && this.email.invalid) || this.emailValidationFailed;
    }
    get hasPasswordError() {
        return this.password.touched && this.password.invalid;
    }

    ngOnInit() {
        this.email.valueChanges.pipe(takeUntil(this.destroyed$), pairwise()).subscribe(([prev, next]) => {
            if (prev !== next) {
                this.failed = false;
                this.emailValidationFailed = false;
                this.state = { type: 'initial' };
            }
        });
        this.password.valueChanges.pipe(takeUntil(this.destroyed$)).subscribe(_ => (this.failed = false));
    }

    continueClicked() {
        this.failed = false;
        this.email.markAsTouched();
        if (this.email.invalid) {
            return;
        }

        if (this.state.type === 'initial') {
            this.loading = true;
            this.cd.markForCheck();
            this.authService
                .countriesForEmail(this.email.value)
                .pipe(
                    finalize(() => {
                        this.loading = false;
                        this.cd.markForCheck();
                    }),
                )
                .subscribe(
                    response => {
                        if (response.data.length === 0) {
                            this.navigationService.navigateToAuthScreen(AuthSubRouteType.signUp, {
                                queryParams: { email: this.email.value },
                            });
                        } else {
                            this.state = { type: 'accountInCountries', countries: response.data };
                        }
                    },
                    _ => (this.emailValidationFailed = true),
                );
        } else if (this.state.type === 'accountInCountries') {
            this.password.markAsTouched();
            if (this.password.invalid) {
                return;
            }

            if (this.state.countries.length > 1) {
                const overlay = this.authOverlayService.openOverlay(CountryPickerOverlayComponent);
                overlay.countrySelected.subscribe(value => this.signIn(value.countryCode));
                overlay.countries = this.state.countries;
            } else {
                this.signIn(this.state.countries[0].countryCode);
            }
        }
    }

    forgotPasswordClicked() {
        this.navigationService.navigateToAuthScreen(AuthSubRouteType.forgotPassword, { queryParams: { email: this.email.value ?? '' } });
    }

    private signIn(country: CountryCode) {
        this.loading = true;
        this.cd.markForCheck();

        this.authService.signIn({ email: this.email.value ?? '', password: this.password.value ?? '' }, country).subscribe(
            response => this.onAuthTokenReceived(response),
            _ => {
                this.failed = true;
                this.loading = false;
                this.cd.markForCheck();
            },
        );
    }
}
