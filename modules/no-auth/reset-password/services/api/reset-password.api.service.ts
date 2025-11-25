import { Injectable, inject } from '@angular/core';
import { ApiService } from 'app/services/api/api.service';
import { ResponseParser } from 'app/parsers/response-parser';
import { User } from 'app/models/api/user';
import { map } from 'rxjs/operators';

@Injectable()
export class ResetPasswordApiService {
    private apiService = inject(ApiService);

    resetPassword(password: string, token: string) {
        return this.apiService
            .post('/users/password?include=user,access-token', {
                body: { password, token },
            })
            .pipe(
                map(response => {
                    return {
                        user: ResponseParser.parseObject<User>(response).data,
                        token: response.included?.find(item => item.type === 'tokens')?.attributes?.token as string | undefined,
                    };
                }),
            );
    }
}
