import { Component, Input, OnInit, inject } from '@angular/core';
import { FormControl, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Country, CountryCode } from 'app/models/api/country';
import { FacebookUserResponse } from 'app/models/facebook-types';
import { GenericError } from 'app/services/api/api.service';
import { JwtUtils } from 'app/utils/jwt-utils';
import { GoogleAuthResponse, SocialUser } from 'modules/auth/auth-types';
import { BaseAuthFlowComponent } from 'modules/auth/components/base-auth-flow.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatInput } from '@angular/material/input';
import { MatOption } from '@angular/material/core';
import { MatSelect } from '@angular/material/select';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { NgTemplateOutlet } from '@angular/common';
import { SharedModule } from 'modules/shared/shared.module';
import { TermsAndPrivacyComponent } from 'modules/auth/components/terms-and-privacy/terms-and-privacy.component';

@Component({
    selector: 'sign-up-sso',
    templateUrl: './sign-up-sso.component.html',
    styleUrls: ['./sign-up-sso.component.less'],
    standalone: true,
    imports: [
        SharedModule,
        FormsModule,
        MatFormField,
        MatLabel,
        MatSelect,
        ReactiveFormsModule,
        MatOption,
        MatInput,
        TermsAndPrivacyComponent,
        NgTemplateOutlet,
        TranslateModule,
    ],
})
export class SignUpSSOComponent extends BaseAuthFlowComponent implements OnInit {
    @Input() provider: 'google' | 'facebook';

    error?: 'generic' | 'emailAlreadyUsed';

    countryControl = new FormControl<CountryCode | undefined>(undefined, {
        nonNullable: true,
        validators: [Validators.required],
    });
    emailControl = new FormControl('', {
        nonNullable: true,
        validators: [Validators.email, Validators.required],
    });

    get hasCountryError() {
        return this.countryControl.touched && this.countryControl.invalid;
    }
    get hasEmailError() {
        return this.emailControl.touched && this.emailControl.invalid;
    }
    get hasEmail() {
        return !!this.socialUser?.email;
    }

    countries: Country[] = [];
    socialUser?: SocialUser;

    private readonly route = inject(ActivatedRoute);
    private accessToken?: string;

    ngOnInit() {
        this.countriesApiService.countries().subscribe(res => (this.countries = res.data));
        this.emailControl.setValue(this.socialUser?.email ?? '');
        this.accessToken = this.route.snapshot.queryParamMap.get('token') ?? undefined;
        this.initSocialUser();
    }

    continueClicked() {
        this.error = undefined;
        this.countryControl.markAsTouched();
        const countryCode = this.countryControl.value;
        if (this.countryControl.invalid || !this.socialUser || !this.accessToken || !countryCode) {
            return;
        }

        let creationData;
        if (this.provider === 'facebook') {
            this.emailControl.markAsTouched();
            if (this.emailControl.invalid && !this.hasEmail) {
                return;
            }
            creationData = {
                facebookAccessToken: this.accessToken,
                email: this.hasEmail ? undefined : (this.emailControl.value ?? undefined),
            };
        } else {
            creationData = { googleAuthToken: this.accessToken };
        }

        this.loading = true;
        this.userService.createUser(creationData, countryCode).subscribe(
            res => this.onUserCreated(res.data, res.meta.accessToken, countryCode),
            (error: GenericError) => {
                if (error.error?.errors?.some(item => item.title === 'This e-mail already exists')) {
                    this.error = 'emailAlreadyUsed';
                } else {
                    this.error = 'generic';
                }

                this.loading = false;
                this.cd.markForCheck();
            },
        );
    }

    private initSocialUser() {
        if (!this.accessToken) {
            return;
        }

        if (this.provider === 'google') {
            const decodedResponse = JwtUtils.parse<GoogleAuthResponse>(this.accessToken);
            if (decodedResponse) {
                const parts = decodedResponse.picture.split('=');
                if (parts.length > 1) {
                    parts.pop();
                }
                parts.push('s150-c');

                this.socialUser = {
                    firstName: decodedResponse.given_name,
                    lastName: decodedResponse.family_name,
                    email: decodedResponse.email,
                    photoUrl: parts.join('='),
                };
            }
        } else if (this.provider === 'facebook') {
            FB.api('/me', { fields: 'id,last_name,first_name,email,picture' }, response => {
                const fbUser = response as FacebookUserResponse;

                if (!fbUser.error) {
                    this.socialUser = {
                        firstName: fbUser.first_name,
                        lastName: fbUser.last_name,
                        email: fbUser.email,
                        photoUrl: `https://graph.facebook.com/v18.0/${fbUser.id}/picture?height=200&width=200`,
                    };
                    this.cd.markForCheck();
                } else {
                    // TODO: notify about error
                }
            });
        }
    }
}
