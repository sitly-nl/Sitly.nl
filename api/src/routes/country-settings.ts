import { Files } from './../services/files.service';
import { TextAnalyzerService } from './../services/text-analyzer.service';
import { Language } from './../Language';
import { SitlyRouter } from './sitly-router';
import { Response } from 'express';
import { BaseRoute } from './route';
import { Serializer as JSONAPISerializer } from 'jsonapi-serializer';
import { config } from './../../config/config';
import { BrandCode, brandCodeToCountryCode } from '../models/brand-code';
import { PageUrlService } from '../services/page-url.service';
import { Environment } from '../services/env-settings.service';
import { ABTests } from './ab-tests';
import { AdyenService } from '../services/payments/adyen.service';
import { UrlUtil } from '../utils/url-util';
import { ConfigInterface } from '../../config/config-interface';
import { CacheItem, CacheService } from '../services/cache.service';
import { Util } from '../utils/util';
import { SubscriptionResponse } from '../models/serialize/subscription-response';
import { getModels } from '../sequelize-connections';
import { FeaturesService } from '../services/features/features.service';
import { GrowthbookProjectId } from '../services/features/growthbook-types';
import { TranslationsService } from '../services/translations.service';
import { OptionalUserRequest } from '../services/auth.service';
import { User } from '../models/user/user.model';
import { LocaleId } from '../models/locale.model';
import { Op } from 'sequelize';
import { CouponResponse } from '../models/serialize/coupon-response';

const serializer = new JSONAPISerializer('settings', {
    attributes: ['value', 'id'],
    keyForAttribute: key => key,
    dataMeta: {
        type: (item: SettingInterface) => item.type,
    },
});

interface SettingInterface {
    id: string;
    value: unknown;
    type: 'boolean' | 'string' | 'number' | 'array' | 'object';
}

export class CountrySettingsRoute extends BaseRoute {
    static childminderMinAge = 18;
    static winbackDiscountPercentage = 50;

    static create(router: SitlyRouter) {
        router.get<OptionalUserRequest>('/country-settings', (req, res) => {
            return new CountrySettingsRoute().index(req, res);
        });
    }

    static localizeMoneyFormat(string: string, localeId: LocaleId | undefined) {
        if (localeId === LocaleId.fr_FR && string.includes('€')) {
            return string.replace('€', '') + ' €';
        } else if (localeId === LocaleId.fr_CA && string.includes('$')) {
            return string.replace(/\$/g, '') + ' $';
        }
        return string;
    }

    private async getSubscriptions(user: User) {
        let subscriptions = user.webrole_id ? await getModels(user.brandCode).Subscription.byWebroleId(user.webrole_id) : [];

        const age = user.age;
        const ageSpecialSubscriptions = subscriptions.filter(item => item.max_age && age <= item.max_age);
        subscriptions = ageSpecialSubscriptions.length > 0 ? ageSpecialSubscriptions : subscriptions.filter(item => !item.max_age);

        const showAVersion = ABTests.showAVersion(user);
        return subscriptions.map(item => {
            if (item.testVariant?.original_subscription_id) {
                if (showAVersion) {
                    item.ab_test_id = item.testVariant.ab_test_id;
                    return item;
                } else {
                    return item.testVariant;
                }
            } else {
                return item;
            }
        });
    }

    private async getCoupons(user: User, activeSubscriptionIds: number[]) {
        return getModels(user.brandCode).Coupon.findAll({
            where: {
                active: 1,
                coupon_code: user.customUser.active_coupon_code ?? undefined,
                start_date: {
                    [Op.lte]: new Date(),
                },
                [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: new Date() } }],
                subscription_id: {
                    [Op.in]: activeSubscriptionIds,
                },
            },
        });
    }

    private async getHourlyRateOptions(brandCode: BrandCode, localeId: LocaleId) {
        const hourlyRateOptions = config.getConfig(brandCode).hourlyRateOptions;
        const negotiableTranslation = await TranslationsService.singleTranslation({
            localeId,
            groupName: 'api',
            code: 'hourlyRate.negotiate',
        });
        return Util.keysOf(hourlyRateOptions).reduce(
            (acc, value) => {
                const label = hourlyRateOptions[value].replace('[negotiable]', negotiableTranslation);
                acc.push({ value, label: CountrySettingsRoute.localizeMoneyFormat(label, localeId) });
                return acc;
            },
            [] as { value: string; label: string }[],
        );
    }

    private getSetting(
        settings: ConfigInterface,
        settingName: string,
        settingKey: keyof ConfigInterface,
        type: 'boolean' | 'string' | 'number' | 'array' | 'object',
        callback?: (arg: never) => unknown,
    ) {
        return {
            id: settingName,
            value: callback ? callback(settings[settingKey] as never) : settings[settingKey],
            type,
        };
    }

    private loadEnvSettings(): SettingInterface[] {
        return [
            { id: 'googleTagManagerAuth', value: Environment.apiKeys.google_tag_manager_auth, type: 'string' },
            { id: 'googleTagManagerEnv', value: Environment.apiKeys.google_tag_manager_env, type: 'string' },
            { id: 'instagramAppId', value: Environment.apiKeys.instagram_app_id, type: 'number' },
            { id: 'cdnUrl', value: Environment.apiKeys.cdn_url, type: 'string' },
        ];
    }

    private loadBrandSettings(brandConfigSettings: ConfigInterface) {
        const settings: SettingInterface[] = [];

        const items = {
            boolean: [
                'showChildminders',
                'showChildminderLocationOptions',
                'useProvinces',
                'usePostalCodes',
                'showMapBackend',
                'showMapFrontend',
                'showWelfareVouchers',
                'showCertificateOfGoodBehavior',
            ],
            number: ['babysitterMinAge', 'facebookAppId', 'invitesDailyLimit'],
            string: ['brandCode', 'countryCode', 'currencyCode', 'hourlyRateMoneyFormat', 'moneyFormat'],
            object: ['addressComponents', 'socialPages'],
            array: ['sharingMethods', 'avatarExamplesUrls'],
        } as const;
        Util.entries(items).forEach(([key, values]) => {
            values.forEach(item => {
                settings.push(this.getSetting(brandConfigSettings, item, item, key));
            });
        });

        settings.push(
            this.getSetting(
                brandConfigSettings,
                'frontendUrl',
                'url',
                'string',
                !Environment.isProd ? (url: string) => url.replace('www', 'acceptance.www') : undefined,
            ),
        );
        settings.push(
            this.getSetting(brandConfigSettings, 'countryWebAppUrl', 'url', 'string', (url: string) => {
                if (!Environment.isProd) {
                    return url.replace('www', 'acceptance.app');
                } else {
                    return url.replace('www', 'app');
                }
            }),
        );
        settings.push(
            this.getSetting(brandConfigSettings, 'defaultLocale', 'placeNameLocales', 'string', (placeNameLocales: string[]) =>
                placeNameLocales[0].replace('_', '-'),
            ),
        );
        settings.push(this.getSetting(brandConfigSettings, 'countryBounds', 'mapBounds', 'object'));

        return settings;
    }

    async index(req: OptionalUserRequest, res: Response) {
        const brandConfigSettings = config.getConfig(req.brandCode);
        if (!brandConfigSettings) {
            try {
                throw new Error(`Config missing for ${req.brandCode} (config/config-${req.brandCode}.ts)`);
            } catch (e) {
                return this.serverError(req, res, e as Error);
            }
        }

        const settings: SettingInterface[] = [];
        try {
            settings.push(...(await this.getStaticSettings(req, brandConfigSettings)));
        } catch (e) {
            return this.serverError(req, res, e as Error);
        }

        const user = req.user;
        if (user) {
            if (Util.isAndroidApp(req.headers)) {
                settings.push({
                    id: 'androidSubscriptions',
                    value: brandConfigSettings.androidSubscriptions[user.isParent ? 'parents' : 'sitters'],
                    type: 'array',
                });
            } else {
                const subscriptions = await this.getSubscriptions(user);
                const subscriptionsMapped = subscriptions.map(subscription => {
                    const res = SubscriptionResponse.instance(subscription);
                    return SubscriptionResponse.keys.reduce(
                        (acc, curr) => {
                            acc[curr] = res[curr];
                            return acc;
                        },
                        {} as Record<string, unknown>,
                    );
                });
                settings.push({
                    id: 'subscriptions',
                    value: subscriptionsMapped,
                    type: 'array',
                });

                if (user.customUser.active_coupon_code) {
                    const activeCoupons = await this.getCoupons(
                        user,
                        subscriptions.map(item => item.instance_id),
                    );
                    const couponsMapped = activeCoupons.map(coupon => {
                        const res = CouponResponse.instance(coupon);
                        return CouponResponse.keys.reduce(
                            (acc, curr) => {
                                acc[curr] = res[curr];
                                return acc;
                            },
                            {} as Record<string, unknown>,
                        );
                    });
                    settings.push({
                        id: 'coupons',
                        value: couponsMapped,
                        type: 'array',
                    });
                }
            }

            // AB tests
            const aVersion = ABTests.showAVersion(user);
            ABTests.tests.forEach(test => {
                const isEnabled = ABTests.testEnabled(test, brandCodeToCountryCode(req.brandCode), {
                    role: user.webrole_id,
                });
                if (isEnabled) {
                    settings.push({
                        id: test.name,
                        value: `${test.experimentId}.${aVersion ? '0' : '1'}`,
                        type: 'string',
                    });
                }
            });
        }

        let ip = (req.headers['x-forwarded-for'] as string) ?? req.socket.remoteAddress;
        if (ip?.startsWith('::ffff:')) {
            ip = ip.substring(7);
        }
        settings.push({
            id: 'clientIp',
            value: ip,
            type: 'string',
        });

        if (req.query['js-var']) {
            res.header('content-type', 'text/javascript');
            const variableName = (req.query['js-var'] as string).replace(/[^a-zA-Z0-9._]/g, '');

            if (req.get('accept') === 'application/vnd.api+json') {
                res.send(`${variableName} = ${JSON.stringify(serializer.serialize(settings))}`);
            } else {
                const settingsObject = settings.reduce(
                    (carrier, setting) => {
                        carrier[setting.id] = setting.value;
                        return carrier;
                    },
                    {} as Record<string, unknown>,
                );
                res.send(`${variableName} = ${JSON.stringify(settingsObject)}`);
            }
        } else {
            res.json(serializer.serialize(settings));
        }
    }

    private async getStaticSettings(req: OptionalUserRequest, brandConfigSettings: ConfigInterface) {
        const {
            locale: localeCode,
            localeId,
            headers: { host },
        } = req;
        const cache = await CacheService.getInstance(
            CacheItem.countrySettings({
                brandCode: brandConfigSettings.brandCode,
                localeCode,
                host: host ?? '',
            }),
            !CacheService.wantsCache(req),
        );

        const staticSettingsCache = await cache.get<SettingInterface[]>();
        if (staticSettingsCache) {
            return staticSettingsCache;
        }

        const staticSettings = [...this.loadEnvSettings(), ...this.loadBrandSettings(brandConfigSettings)];

        const brandCode = brandConfigSettings.brandCode.toLowerCase() as BrandCode;

        staticSettings.push({
            id: 'apiUrl',
            value: UrlUtil.apiUrl(req),
            type: 'string',
        });

        const pageUrlService = new PageUrlService(brandCode, localeId, host);
        staticSettings.push({
            id: 'contactUrl',
            value: await pageUrlService.getContactUrl(),
            type: 'string',
        });

        staticSettings.push({
            id: 'findFosterGuideUrl',
            value: await pageUrlService.getUrlByPageCode('ten-steps-parents'),
            type: 'string',
        });

        staticSettings.push({
            id: 'findParentGuideUrl',
            value: await pageUrlService.getUrlByPageCode('ten-steps-fosters'),
            type: 'string',
        });

        const requestLanguage = localeCode.split('_').shift();

        const commonLanguageCodesClone = [...Files.commonLanguageCodes];
        const commonNativeLanguages = [...brandConfigSettings.nativeLanguageOrder].reverse();
        for (const nativeLanguageCode of commonNativeLanguages) {
            // sort common language codes by array in config
            commonLanguageCodesClone.splice(
                0,
                0,
                commonLanguageCodesClone.splice(commonLanguageCodesClone.indexOf(nativeLanguageCode), 1)[0],
            );
        }
        const nativeLanguages = Language.getLanguagesByLanguageCodes(commonLanguageCodesClone, requestLanguage).map(lang => {
            if (commonNativeLanguages.includes(lang.code ?? '')) {
                lang.isCommon = true;
            }
            return lang;
        });
        staticSettings.push({
            id: 'nativeLanguageOptions',
            value: nativeLanguages,
            type: 'array',
        });

        staticSettings.push({
            id: 'languageKnowledgeOptions',
            value: Language.getLanguagesByLanguageCodes(brandConfigSettings.languageKnowledgeOptions, requestLanguage),
            type: 'array',
        });

        const paymentMethods = await AdyenService.getPaymentMethods(
            brandConfigSettings.countryCode,
            brandConfigSettings.currencyCode,
            brandConfigSettings.adyenMerchantAccount,
        );
        if (paymentMethods) {
            staticSettings.push({
                id: 'paymentMethodsAdyen',
                value: paymentMethods.adyenResponse,
                type: 'object',
            });
        }

        const hourlyRateOptions = await this.getHourlyRateOptions(brandCode, localeId);
        staticSettings.push({
            id: 'hourlyRateOptions',
            value: hourlyRateOptions,
            type: 'array',
        });

        staticSettings.push({
            id: 'maxZoom',
            value: 16,
            type: 'number',
        });
        staticSettings.push({
            id: 'childminderMinAge',
            value: CountrySettingsRoute.childminderMinAge,
            type: 'number',
        });
        staticSettings.push({
            id: 'winbackDiscountPercentage',
            value: CountrySettingsRoute.winbackDiscountPercentage,
            type: 'number',
        });

        const locales = await getModels(brandCode).Locale.all();
        staticSettings.push({
            id: 'locales',
            value: locales.map(locale => {
                return {
                    localeCode: locale.locale_code.replace('_', '-'),
                    localeName: locale.locale_name,
                };
            }),
            type: 'array',
        });

        staticSettings.push({
            id: 'aboutChecks',
            value: { fake: TextAnalyzerService.fakeAboutRegExp },
            type: 'object',
        });

        staticSettings.push({
            id: 'webAppFeatures',
            value: await FeaturesService.getFeatures(GrowthbookProjectId.webApp, brandCode),
            type: 'object',
        });
        staticSettings.push({
            id: 'showRecommendations',
            value: FeaturesService.showRecommendations(brandCode),
            type: 'string',
        });

        staticSettings.push({
            id: 'hideVideoCall',
            value: true,
            type: 'boolean',
        });

        cache.set(staticSettings);

        return staticSettings;
    }
}
