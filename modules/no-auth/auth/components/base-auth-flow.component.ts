import { Component, inject } from '@angular/core';
import { NoAuthBaseComponent } from 'app/components/no-auth-base.component';
import { SessionService } from 'app/services/session.service';
import { CountriesApiService } from 'app/services/api/countries.api.service';
import { AuthService } from 'app/services/api/auth.service';
import { AuthOverlayService } from 'modules/auth/services/auth-overlay.service';
import { ParsedResponse } from 'app/models/api/response';
import { AuthToken } from 'app/models/api/auth-token';
import { User } from 'app/models/api/user';
import { ToolbarItem } from 'modules/shared/components/toolbar/toolbar.component';
import { Router } from '@angular/router';
import { CountryCode } from 'app/models/api/country';

@Component({
    template: '',
})
export abstract class BaseAuthFlowComponent extends NoAuthBaseComponent {
    ToolbarItem = ToolbarItem;
    loading = false;

    protected readonly authOverlayService = inject(AuthOverlayService);
    protected readonly authService = inject(AuthService);
    protected readonly sessionService = inject(SessionService);
    protected readonly countriesApiService = inject(CountriesApiService);
    protected readonly router = inject(Router);

    onAuthTokenReceived(response: ParsedResponse<AuthToken, { reEnabled: boolean }>) {
        if (response.meta?.reEnabled) {
            this.storageService.reEnabled = true;
        }

        this.sessionService.startWithInitialData(response.data).subscribe(_ => this.sessionService.navigateToDefaultRoute(true));
    }

    onSocialSsoLoading(value: boolean) {
        this.loading = value;
        this.cd.markForCheck();
    }

    onUserCreated(user: User, token: string, countryCode: CountryCode) {
        this.onAuthTokenReceived({
            data: { token, countryCode, user, id: 'tokens', meta: {}, links: {} },
        });
    }
}
