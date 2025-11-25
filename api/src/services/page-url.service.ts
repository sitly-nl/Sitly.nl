import { config } from './../../config/config';
import { Locale, LocaleId } from '../models/locale.model';
import { ConfigInterface } from '../../config/config-interface';
import { BrandCode } from '../models/brand-code';
import { Environment } from './env-settings.service';
import { User, WebRoleId } from '../models/user/user.model';
import { getMainModels, getModels } from '../sequelize-connections';
import { Page } from '../models/cms/page.model';
import { LinksService } from './links.service';

const urlCache = {} as Record<string, string>;

export class PageUrlService {
    brandConfigSettings: ConfigInterface;
    private baseUrl: string;
    private isTestEnvironment: boolean;

    constructor(
        private brandCode: BrandCode,
        private localeId: LocaleId | undefined,
        host: string | undefined = Environment.host(),
    ) {
        this.isTestEnvironment = Environment.isTest || host?.indexOf('localhost') !== -1;
        this.brandConfigSettings = JSON.parse(JSON.stringify(config.getConfig(this.brandCode))) as ConfigInterface;
        this.baseUrl = LinksService.websiteUrl(this.brandCode);
    }

    private getUrlByPage(page: Page | undefined, locale: Locale | null) {
        if (!locale) {
            return undefined;
        }
        const cacheId = `${this.brandCode}-${locale.locale_id}-${this.isTestEnvironment ? 1 : 0}-${page?.page_code ?? 'home'}`;

        if (urlCache[cacheId] && !Environment.isApiTests) {
            return urlCache[cacheId];
        }

        let urlCountryCode = '';
        const localeId = locale.locale_id;
        const languageCode = locale.locale_code.split('_')[0];
        urlCountryCode = localeId !== this.brandConfigSettings.defaultLocaleId ? '/' + languageCode : '';

        let pageUrl = '';
        if (page) {
            const translation = page.translations.find(item => item.locale_id === localeId);
            if (!translation) {
                throw new Error(`translation missed for page=${page.page_code}, locale=${localeId}`);
            }

            pageUrl = encodeURIComponent(translation.page_url as string);

            const routeAliases = this.brandConfigSettings.routeAliases?.[locale.locale_code];
            if (routeAliases?.[pageUrl]) {
                pageUrl = routeAliases[pageUrl];
            }
        }

        urlCache[cacheId] = `${this.baseUrl}${urlCountryCode}${pageUrl ? '/' + pageUrl : ''}`;
        return urlCache[cacheId];
    }

    async getUrlByPageCode(
        pageCode:
            | 'contact'
            | 'ten-steps-parents'
            | 'ten-steps-fosters'
            | 'babysit'
            | 'babysit-jobs'
            | 'childminder'
            | 'childminder-jobs'
            | 'parents-for-parents',
    ) {
        const cacheId = `${this.brandCode}-${this.localeId}-${this.isTestEnvironment ? 1 : 0}-${pageCode}`;
        if (urlCache[cacheId] && !Environment.isApiTests) {
            return urlCache[cacheId];
        }

        const { Locale } = getModels(this.brandCode);
        const locale =
            (this.localeId ? await Locale.byId(this.localeId) : undefined) ?? (await Locale.byId(this.brandConfigSettings.defaultLocaleId));
        const localeId = locale?.locale_id;
        const page = await getMainModels().Page.byPageCode(pageCode, localeId);
        if (!page) {
            return undefined;
        }

        return this.getUrlByPage(page, locale);
    }

    async getPublicProfileUrl(user: User) {
        let rolePageCode;
        switch (user.webrole_id) {
            case WebRoleId.parent:
                if (user.customUser?.pref_babysitter) {
                    rolePageCode = 'babysit-jobs' as const;
                } else if (user.customUser?.pref_childminder) {
                    rolePageCode = 'childminder-jobs' as const;
                } else {
                    rolePageCode = 'parents-for-parents' as const;
                }

                break;
            case WebRoleId.babysitter:
                rolePageCode = 'babysit' as const;
                break;
            case WebRoleId.childminder:
                rolePageCode = 'childminder' as const;
                break;
            default:
                return undefined;
        }

        const themePage = await this.getUrlByPageCode(rolePageCode);
        await user.customUser.loadRelationIfEmpty('place');
        if (user.customUser.place) {
            return `${themePage}/${user.customUser.place.place_url}/${user.customUser?.webuser_url}`;
        }
    }

    async getContactUrl() {
        return this.getUrlByPageCode('contact');
    }

    async getTenStepsUrl(userType: 'parents' | 'fosters') {
        return this.getUrlByPageCode(`ten-steps-${userType}`);
    }
}
