import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { AuthToken } from 'app/models/api/auth-token';
import { Error } from 'app/services/api/api.service';
import { AuthService } from 'app/services/api/auth.service';
import { CountriesApiService } from 'app/services/api/countries.api.service';
import { CountryCodesError } from 'modules/auth/auth-types';
import { AuthOverlayService } from 'modules/auth/services/auth-overlay.service';
import { NavigationService } from 'app/services/navigation.service';
import { AuthSubRouteType } from 'modules/auth/auth-route-type';
import { Country, CountryCode } from 'app/models/api/country';
import { map } from 'rxjs/operators';
import { CountryPickerOverlayComponent } from 'modules/auth/components/country-picker/country-picker-overlay.component';
import { ParsedResponse } from 'app/models/api/response';
import { SocialUserToken } from 'app/models/generic-types';
import { GoogleService } from 'app/services/google.service';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';
import { GoogleButtonComponent } from 'modules/auth/components/google-button/google-button.component';

@Component({
    selector: 'social-sso',
    templateUrl: './social-sso.component.html',
    styleUrls: ['./social-sso.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [GoogleButtonComponent, SharedModule, TranslateModule],
})
export class SocialSSOComponent {
    @Output() token = new EventEmitter<ParsedResponse<AuthToken, { reEnabled: boolean }>>();
    @Output() loading = new EventEmitter<boolean>();
    googleLoaded = signal(!!window.google);

    private readonly authOverlayService = inject(AuthOverlayService);
    private readonly authService = inject(AuthService);
    private readonly navigationService = inject(NavigationService);
    private readonly countriesApiService = inject(CountriesApiService);
    private readonly googleService = inject(GoogleService);

    ngOnInit() {
        if (!this.googleLoaded()) {
            this.googleService.loadGSIClientIfNecessary().then(_ => this.googleLoaded.set(!!window.google));
        }
    }

    loginWithSocialUser(socialUser: SocialUserToken, countryCode?: CountryCode) {
        this.loading.emit(true);

        const body =
            socialUser.provider === 'facebook'
                ? { facebookAccessToken: socialUser.accessToken }
                : { googleAuthToken: socialUser.accessToken };
        this.authService.signIn(body, countryCode).subscribe(
            response => {
                this.token.emit(response);
            },
            (err: Error<CountryCodesError>) => {
                const countries = err.error?.errors?.[0]?.meta?.countryCodes ?? [];
                if (countries.length > 0) {
                    this.showSocialUserCountryPicker(countries, value => this.loginWithSocialUser(socialUser, value.countryCode));
                } else {
                    this.navigationService.navigateToAuthScreen(
                        socialUser.provider === 'facebook' ? AuthSubRouteType.signUpFacebook : AuthSubRouteType.signUpGoogle,
                        {
                            queryParams: { token: socialUser.accessToken },
                        },
                    );
                }

                this.loading.emit(false);
            },
        );
    }

    protected showSocialUserCountryPicker(countries: string[], onSelect: (value: Country) => void) {
        this.countriesApiService
            .countries()
            .pipe(map(res => res.data.filter(item => countries.includes(item.countryCode))))
            .subscribe(countries => {
                const overlay = this.authOverlayService.openOverlay(CountryPickerOverlayComponent);
                overlay.countrySelected.subscribe(country => onSelect(country));
                overlay.countries = countries;
                overlay.refresh();
            });
    }
}
