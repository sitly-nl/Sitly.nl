import { config } from '../../config/config';
import { User } from '../models/user/user.model';
import { request } from '../utils/util';
import { CacheItem, CacheService } from './cache.service';
import { Environment } from './env-settings.service';

export class TrustPilotService {
    static async getReviewUrl(user: User, inputLocale: string) {
        const token = await TrustPilotService.getToken();

        const brandConfig = config.getConfig(user.brandCode);
        const supportedLocales = [
            'da-DK',
            'de-AT',
            'de-CH',
            'de-DE',
            'en-AU',
            'en-CA',
            'en-GB',
            'en-IE',
            'en-NZ',
            'en-US',
            'es-ES',
            'fi-FI',
            'fr-BE',
            'fr-FR',
            'it-IT',
            'ja-JP',
            'nb-NO',
            'nl-BE',
            'nl-NL',
            'pl-PL',
            'pt-BR',
            'pt-PT',
            'ru-RU',
            'sv-SE',
            'zh-CN',
        ];
        const locale = supportedLocales.includes(inputLocale) ? inputLocale : 'en-US';
        const businessUnitId = brandConfig.trustPilotBusinessUnitId;
        const res = await request({
            method: 'POST',
            url: `https://invitations-api.trustpilot.com/v1/private/business-units/${businessUnitId}/invitation-links?token=${token}`,
            json: {
                name: `${user.first_name} ${user.last_name}`,
                locale,
                redirectUri: brandConfig.url,
                email: user.email,
            },
        });
        return res.body?.url as string | undefined;
    }

    private static async getToken() {
        const cacheOptions = CacheItem.trustpilot({ key: 'token' });
        const cache = await CacheService.getInstance(cacheOptions);
        let trustpilotAccessToken = await cache.get<string>();
        if (!trustpilotAccessToken) {
            const tokenRes = await request({
                method: 'POST',
                url: 'https://api.trustpilot.com/v1/oauth/oauth-business-users-for-applications/accesstoken',
                headers: {
                    Authorization: `Basic ${Buffer.from(
                        `${Environment.apiKeys.trustpilot_auth.api_key}:${Environment.apiKeys.trustpilot_auth.secret}`,
                    ).toString('base64')}`,
                },
                form: {
                    grant_type: 'password',
                    username: Environment.apiKeys.trustpilot_auth.username,
                    password: Environment.apiKeys.trustpilot_auth.password,
                },
            });
            if (!tokenRes.body) {
                throw new Error('Can not get Trustpilot token - empty body');
            }

            const tokenResParsed = JSON.parse(tokenRes.body as string) as { access_token?: string; expires_in?: number };
            trustpilotAccessToken = tokenResParsed?.access_token;
            if (!trustpilotAccessToken) {
                throw new Error('Can not get Trustpilot token - invalid json in body', { cause: tokenResParsed });
            }

            cacheOptions.ttl = Math.max((tokenResParsed?.expires_in ?? 0) - 24 * 60 * 60, 60);
            await cache.set(trustpilotAccessToken);
        }
        return trustpilotAccessToken;
    }
}
