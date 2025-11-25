import { config } from '../../config/config';
import { BrandCode } from '../models/brand-code';
import { User } from '../models/user/user.model';
import { SitlyToken } from '../sitly-token';
import { Environment } from './env-settings.service';
import { GA4EventParams } from './tracking.service';
import { stringify } from 'qs';
import { request } from '../utils/util';
import { getModels } from '../sequelize-connections';
import { LocaleId } from '../models/locale.model';

export class LinksService {
    // --- website --- //
    static websiteUrl(brandCode: BrandCode) {
        return config.getConfig(brandCode).url;
    }

    static async localizedWebsiteUrl(brandCode: BrandCode, localeIdInput: LocaleId) {
        let urlCountryCode = '';
        const locale = localeIdInput ? await getModels(brandCode).Locale.byId(localeIdInput) : undefined;
        if (locale && locale.locale_id !== config.getConfig(brandCode).defaultLocaleId) {
            const languageCode = locale.locale_code.split('_')[0];
            urlCountryCode = '/' + languageCode;
        }

        return `${LinksService.websiteUrl(brandCode)}${urlCountryCode}`;
    }

    // --- web-app --- //
    static get webAppBaseUrl() {
        return Environment.isProd ? 'https://app.sitly.com' : 'https://app.test.sitly.com';
    }

    static accountSettingsUrl(tokenInput?: User | string) {
        return `${LinksService.webAppBaseUrl}/account${
            tokenInput ? `?tempToken=${typeof tokenInput === 'string' ? tokenInput : SitlyToken.tempToken(tokenInput)}` : ''
        }`;
    }

    static chatUrl(chatPartnerUrl: string) {
        return `${LinksService.webAppBaseUrl}/messages/${chatPartnerUrl}`;
    }

    static completionUrl(user: User) {
        return `${LinksService.webAppBaseUrl}/complete/start/${user.customUser.webuser_url}/${user.customUser.token_code}?countryCode=${user.brandCode}`;
    }

    static invitesUrl() {
        return `${LinksService.webAppBaseUrl}/invites`;
    }

    static loginUrl(user: User) {
        return `${LinksService.webAppBaseUrl}?tempToken=${SitlyToken.tempToken(user, 'short')}`;
    }

    static premiumUrl() {
        return `${LinksService.webAppBaseUrl}/search/photo(modal:premium/premium-start)`;
    }

    static async postRecommendationUrl(user: User, firstName: string, token: string) {
        const encodedFirstName = Buffer.from(firstName).toString('base64');
        const link = `${LinksService.webAppBaseUrl}/post-recommendation/${user.customUser.webuser_url}?token=${token}&f=${encodedFirstName}&countryCode=${user.brandCode}`;
        const shortenLink = await LinksService.shortenUrl(link);
        return shortenLink ?? link;
    }

    static profileUrl(userUrl: string) {
        return `${LinksService.webAppBaseUrl}/users/${userUrl}`;
    }

    static recommendationUrl(user: User) {
        return `${LinksService.webAppBaseUrl}/account(modal:recommendations)?tempToken=${SitlyToken.tempToken(user, 'short')}`;
    }

    static resetPasswordUrl(brandCode: BrandCode, token: string) {
        return `${LinksService.webAppBaseUrl}/reset-password/${token}?countryCode=${brandCode}`;
    }

    static searchUrl() {
        return `${LinksService.webAppBaseUrl}/search`;
    }

    static settingsUrl(tokenInput?: User | string) {
        return `${LinksService.webAppBaseUrl}/settings${
            tokenInput ? `?tempToken=${typeof tokenInput === 'string' ? tokenInput : SitlyToken.tempToken(tokenInput)}` : ''
        }`;
    }

    // --- api --- //
    static redirectionLink(user: User, destinationUrl: string, param: GA4EventParams) {
        return `${Environment.apiUrl()}/${user.brandCode}/redirections?${stringify({
            redirectUrl: destinationUrl,
            userUrl: user.customUser.webuser_url,
            param,
        })}`;
    }

    // --- link shortener --- //
    private static async shortenUrl(url: string) {
        const res = await request({
            method: 'POST',
            url: 'https://firebasedynamiclinks.googleapis.com/v1/shortLinks',
            qs: { key: Environment.apiKeys.firebase_web },
            json: {
                longDynamicLink: `https://sitly.page.link/?link=${encodeURIComponent(url)}`,
                suffix: {
                    option: 'SHORT',
                },
            },
        });
        return res.body?.shortLink as string | undefined;
    }
}
