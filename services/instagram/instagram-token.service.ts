import { Injectable, inject } from '@angular/core';
import { ResponseParser } from 'app/parsers/response-parser';
import { map, tap } from 'rxjs/operators';
import { ApiService } from 'app/services/api/api.service';
import { InstagramToken } from 'app/models/api/instagram-token';
import { StorageService } from 'app/services/storage.service';
import { UserService } from 'app/services/user.service';

export class InstagramConstants {
    static readonly instagramScope = 'user_profile,user_media';
}

@Injectable({
    providedIn: 'root',
})
export class InstagramTokenService {
    private apiService = inject(ApiService);
    private storageService = inject(StorageService);
    private userService = inject(UserService);

    readonly instagramAppId = 1098884577347935;

    get igUserId() {
        return this.igTokenCache?.instagramUserId;
    }
    get igAccessToken() {
        return this.igTokenCache?.instagramAccessToken;
    }

    private igTokenCache: InstagramToken;

    constructor() {
        if (this.storageService.instagramAuthToken) {
            this.igTokenCache = this.storageService.instagramAuthToken;
            this.storageService.instagramAuthToken = undefined;
        }
    }

    login(source: string) {
        setTimeout(() => {
            const state = {
                source,
            };
            const stateStr = JSON.stringify(state);
            const externalUrl =
                `https://api.instagram.com/oauth/authorize?client_id=${this.instagramAppId}` +
                `&scope=${InstagramConstants.instagramScope}&response_type=code&redirect_uri=${this.redirectUrlFull}&state=${stateStr}`;
            window.open(externalUrl, '_self');
        }, 0);
    }

    requestToken(code: string) {
        return this.apiService.post('/instagram-tokens', { body: { code, redirectUri: this.redirectUrl } }).pipe(
            map(response => ResponseParser.parseObject<InstagramToken, { reEnabled: boolean }>(response)),
            tap(res => {
                this.igTokenCache = res.data;
                if (!this.userService.authUser?.completed) {
                    this.storageService.instagramAuthToken = res.data;
                }
            }),
        );
    }

    private get redirectUrl() {
        const base = document.querySelector('base')?.getAttribute('href');
        return `${window.location.origin}${base}instagram`;
    }

    private get redirectUrlFull() {
        return `${this.redirectUrl}?authToken=${this.storageService.token}`;
    }
}
