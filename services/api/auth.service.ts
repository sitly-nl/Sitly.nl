import { map } from 'rxjs/operators';
import { ApiService, BrandCode } from 'app/services/api/api.service';
import { inject, Injectable } from '@angular/core';
import { ResponseParser } from 'app/parsers/response-parser';
import { AuthToken } from 'app/models/api/auth-token';
import { Country, CountryCode } from 'app/models/api/country';

export interface TempTokenInput {
    token: string;
    countryCode: CountryCode;
}

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    private readonly apiService = inject(ApiService);

    authenticate(body: { userId: string; tokenCode: string }) {
        return this.apiService
            .post('/tokens?include=user.children', { body, noAuth: true })
            .pipe(map(response => ResponseParser.parseObject<AuthToken, { reEnabled: boolean }>(response)));
    }

    signIn(
        body: { email: string; password: string } | { googleAuthToken: string } | { facebookAccessToken: string },
        brandCode: BrandCode = 'main',
    ) {
        return this.apiService
            .post('/tokens?include=user.children', { body, brandCode, noAuth: true })
            .pipe(map(response => ResponseParser.parseObject<AuthToken, { reEnabled: boolean }>(response)));
    }

    countriesForEmail(email: string) {
        return this.apiService
            .get('/tokens/countries', { params: { email }, brandCode: 'main', noAuth: true })
            .pipe(map(response => ResponseParser.parseObject<Country[]>(response)));
    }

    getToken(input: TempTokenInput) {
        return this.apiService
            .post('/tokens?include=user.children', {
                body: { tempToken: input.token },
                brandCode: input.countryCode,
                noAuth: true,
            })
            .pipe(map(response => ResponseParser.parseObject<AuthToken>(response)));
    }
}
