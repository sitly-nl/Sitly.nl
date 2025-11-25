import { Util } from '../utils/util';
import { google } from 'googleapis';
import { people } from 'googleapis/build/src/apis/people';
import { OAuth2Client } from 'google-auth-library';
import { Environment } from './env-settings.service';
import { IncomingHttpHeaders } from 'http';
import { SentryService } from './sentry.service';
import { BrandCode } from '../models/brand-code';

export interface GoogleVerificationResult {
    isSuccessful: boolean;
    payload?: {
        expiryTimeMillis: string;
        orderId: string;
        priceAmountMicros: number;
    };
}

export class GoogleServices {
    static async getAccountFromAuthToken(authToken: string, headers: IncomingHttpHeaders) {
        const googleConfig = Environment.apiKeys.googleapis_auth;
        const client = new OAuth2Client(googleConfig.clientId);
        const ticket = await client.verifyIdToken({
            idToken: authToken,
            audience: Util.isIOSApp(headers)
                ? googleConfig.iOSClientId
                : Util.isNativeAndroidApp(headers)
                  ? googleConfig.androidClientId
                  : googleConfig.clientId,
        });

        const payload = ticket.getPayload();
        const firstName = payload?.given_name;
        const lastName = payload?.family_name;
        const email = payload?.email ?? '';
        const googleAccountId = payload?.sub;
        let avatar = payload?.picture;
        if (avatar) {
            const parts = avatar.split('=');
            if (parts.length > 1) {
                parts.pop();
            }
            parts.push('s1500-c');
            avatar = parts.join('=');
        }
        return {
            firstName,
            lastName,
            email,
            avatarUrl: avatar,
            customUserProperties: {
                google_account_id: googleAccountId,
            },
        };
    }

    static async getAccountFromCode(code: string, redirectUri: string) {
        const googleConfig = Environment.apiKeys.googleapis_auth;

        const auth = new google.auth.OAuth2(googleConfig.clientId, googleConfig.clientSecret, redirectUri);

        const data = await auth.getToken(code);
        const tokens = data.tokens;
        auth.setCredentials(tokens);

        const me = await people('v1').people.get({
            resourceName: 'people/me',
            personFields: 'emailAddresses,names,photos',
            auth,
        });
        const userData = me.data;

        const googleAccountId = userData.resourceName?.replace('people/', '');
        const firstName = userData.names?.[0]?.givenName ?? undefined;
        const lastName = userData.names?.[0]?.familyName ?? undefined;
        const email = userData.emailAddresses?.[0]?.value ?? '';
        let avatar;
        if (userData.photos?.length) {
            avatar = userData.photos.find(photo => photo.metadata?.source?.type === 'PROFILE')?.url ?? userData.photos[0].url ?? undefined;
            if (avatar) {
                const parts = avatar.split('=');
                if (parts.length > 1) {
                    parts.pop();
                }
                parts.push('s1500-c');
                avatar = parts.join('=');
            }
        }
        return {
            firstName,
            lastName,
            email,
            avatarUrl: avatar,
            customUserProperties: {
                google_account_id: googleAccountId,
            },
        };
    }

    static async getAccessToken() {
        const key = Environment.apiKeys.googleapis;
        const scopes = 'https://www.googleapis.com/auth/firebase.messaging';
        const jwtClient = new google.auth.JWT(key.client_email, undefined, key.private_key, scopes, undefined);
        try {
            const res = await jwtClient.authorize();
            return res.access_token ?? undefined;
        } catch (error) {
            SentryService.captureException(error, 'push-notification', BrandCode.main);
        }
    }
}
