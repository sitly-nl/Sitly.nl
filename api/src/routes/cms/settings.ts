import { SitlyRouter } from '../sitly-router';
import { NextFunction, Request, Response } from 'express';
import { BaseRoute } from './../route';
import { Serializer as JSONAPISerializer } from 'jsonapi-serializer';
import { config } from './../../../config/config';
import { BrandCode } from '../../models/brand-code';
import { StringUtil } from '../../utils/string-util';
import { Util } from '../../utils/util';
import { LocaleId } from '../../models/locale.model';
import { TranslationsService } from '../../services/translations.service';
import { LogService } from '../../services/log.service';
import { getModels } from '../../sequelize-connections';

const serializer = new JSONAPISerializer('settings', {
    attributes: ['value'],
    keyForAttribute: 'camelCase',
});

export class CmsSettingsRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.get('/cms/settings', (req, res, next) => {
            return new CmsSettingsRoute().index(req, res, next);
        });
    }

    private async getHourlyRateOptions(brandCode: BrandCode, localeId: LocaleId) {
        const brandConfigSettings = config.getConfig(brandCode);

        const hourlyRateOptions = brandConfigSettings.hourlyRateOptions;
        const negotiableTranslation = await TranslationsService.singleTranslation({
            localeId,
            groupName: 'api',
            code: 'hourlyRate.negotiate',
        });
        const ret = [];

        for (const value of Util.keysOf(hourlyRateOptions)) {
            ret.push({
                value,
                label: hourlyRateOptions[value].replace('[negotiable]', negotiableTranslation),
            });
        }

        return ret;
    }

    async index(req: Request, res: Response, next: NextFunction) {
        LogService.logRequest({ req, user: undefined, label: 'cms.settings' });

        const returnSettings = ['json_ld_info', 'social_pages', 'facebook_app_id', 'enable_google_optimize'];

        const setting = await getModels(req.brandCode).Setting.findOne();
        if (!setting) {
            throw new Error('Settings not defined in database');
        }

        const booleanSettings = ['enable_google_optimize'];
        const publicSettings = [];

        Object.entries(setting.dataValues).forEach(([settingName, settingValue]) => {
            if (returnSettings.indexOf(settingName) > -1) {
                if (booleanSettings.includes(settingName)) {
                    settingValue = !!settingValue;
                }

                if (settingName === 'social_pages') {
                    settingName = 'marketingChannels';
                    settingValue = (settingValue as string)
                        .split(',')
                        .filter(Boolean)
                        .map((item: string) => item.trim());
                }
                publicSettings.push({
                    id: StringUtil.camelCase(settingName),
                    value: settingValue as never,
                });
            }
        });
        const brandConfigSettings = config.getConfig(req.brandCode);
        if (!brandConfigSettings) {
            throw new Error(`Config missing for ${req.brandCode} (config/config-${req.brandCode}.ts)`);
        }

        publicSettings.push({
            id: 'contactEmail',
            value: brandConfigSettings.contactEmail,
        });

        publicSettings.push({
            id: 'brandName',
            value: brandConfigSettings.brandName,
        });

        publicSettings.push({
            id: 'showChildminders',
            value: brandConfigSettings.showChildminders,
        });

        publicSettings.push({
            id: 'maxZoom',
            value: 16,
        });

        publicSettings.push({
            id: 'mapBounds',
            value: brandConfigSettings.mapBounds,
        });

        publicSettings.push({
            id: 'currencyCode',
            value: brandConfigSettings.currencyCode,
        });

        const hourlyRateOptions = await this.getHourlyRateOptions(req.brandCode, req.localeId);

        publicSettings.push({
            id: 'hourlyRateOptions',
            value: hourlyRateOptions,
            type: 'array',
        });

        publicSettings.push({
            id: 'placeNameLocales',
            value: brandConfigSettings.placeNameLocales,
            type: 'array',
        });

        publicSettings.push({
            id: 'appstoreUrl',
            value: brandConfigSettings.appstoreUrl,
            type: 'array',
        });

        publicSettings.push({
            id: 'googleAnalyticsCode',
            value: brandConfigSettings.googleAnalyticsCode,
            type: 'string',
        });

        if (brandConfigSettings.facebookPixelId) {
            publicSettings.push({
                id: 'facebookPixelId',
                value: brandConfigSettings.facebookPixelId,
                type: 'string',
            });
        }

        publicSettings.push({
            id: 'useProvinces',
            value: brandConfigSettings.useProvinces,
            type: 'boolean',
        });

        publicSettings.push({
            id: 'usePostalCodes',
            value: brandConfigSettings.usePostalCodes,
            type: 'boolean',
        });

        publicSettings.push({
            id: 'showMapBackend',
            value: brandConfigSettings.showMapBackend,
            type: 'boolean',
        });

        publicSettings.push({
            id: 'showMapFrontend',
            value: brandConfigSettings.showMapFrontend,
            type: 'boolean',
        });

        publicSettings.push({
            id: 'hourlyRateMoneyFormat',
            value: brandConfigSettings.hourlyRateMoneyFormat,
            type: 'string',
        });

        const ret = serializer.serialize(publicSettings);
        res.json(ret);
    }
}
