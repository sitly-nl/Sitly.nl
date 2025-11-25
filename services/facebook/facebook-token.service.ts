import { Injectable } from '@angular/core';
import { Observable, Subscriber } from 'rxjs';

export class FacebookConstants {
    static readonly facebookScope = 'email,user_photos';
}

export interface FacebookAccessToken {
    token: string;
    data_access_expiration_time: number;
}

@Injectable({
    providedIn: 'root',
})
export class FacebookTokenService {
    requestToken() {
        return new Observable<string>(observer => {
            FB.getLoginStatus(response => {
                if (response.status === 'connected') {
                    observer.next(response.authResponse.accessToken);
                    observer.complete();
                } else {
                    this.loginWithFacebook(observer);
                }
            });
        });
    }

    private loginWithFacebook(observer: Subscriber<string>) {
        FB.login(
            loginResponse => {
                if (loginResponse.authResponse) {
                    observer.next(loginResponse.authResponse.accessToken);
                    observer.complete();
                } else {
                    console.error('User cancelled login or did not fully authorize.');
                    observer.error('login_error');
                    observer.complete();
                }
            },
            { scope: 'email' },
        );
    }
}
