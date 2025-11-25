import { LocaleId } from '../models/locale.model';
import { TranslationValue } from '../models/translation/translation-value.model';
import { getTranslationModels } from '../sequelize-connections';
import { CacheItem, CacheService } from './cache.service';

export type TranslationsGroupName =
    | 'web-app'
    | 'web-app.shared'
    | 'web-app.registration'
    | 'api'
    | 'emails'
    | 'job-portals-xmls'
    | 'messages'
    | 'job-posting'
    | 'about-texts';
export interface Translation {
    code: string;
    value: string;
}

export class Translator {
    constructor(public translations: Translation[] = []) {}

    static instanceFromDatabaseModels(models: TranslationValue[]) {
        return new Translator(
            models.map(item => {
                return {
                    code: item.code.translation_code,
                    value: item.value ?? '',
                };
            }),
        );
    }

    translated(code: string, format?: Record<string, string>, useDefaultTemplateWrapper = true) {
        const translation = this.translations.find(translation => translation.code === code);
        if (translation) {
            let value = translation.value;
            if (format) {
                Object.keys(format).forEach(key => {
                    const regExp = new RegExp(`\\${useDefaultTemplateWrapper ? `{{${key}}}` : key}`, 'g');
                    value = value.replace(regExp, format[key]);
                });
            }
            return value;
        }
        return '';
    }
}

export class TranslationsService {
    static async translator({
        localeId,
        groupName,
        prefix,
        testDb = false,
    }: {
        localeId: LocaleId;
        groupName: TranslationsGroupName;
        prefix?: string | string[];
        testDb?: boolean;
    }) {
        const prefixes = prefix ? (prefix instanceof Array ? prefix : [prefix]) : undefined;
        const cache = await CacheService.getInstance(
            CacheItem.translations({
                localeId,
                groupName,
                prefix: prefixes?.join('|') ?? '',
            }),
        );

        const cachedTranslations = await cache.get<Translation[]>();
        if (cachedTranslations) {
            return new Translator(cachedTranslations);
        }

        const groupsToLoad = groupName.startsWith('web-app') ? [groupName, 'web-app.shared'] : groupName;
        const models = await getTranslationModels(testDb).TranslationValue.getGroupValues({ localeId, groupName: groupsToLoad, prefixes });
        const translator = Translator.instanceFromDatabaseModels(models);
        cache.set(translator.translations);
        return translator;
    }

    static async singleTranslation({
        localeId,
        groupName,
        code,
        testDb = false,
    }: {
        localeId: LocaleId;
        groupName: TranslationsGroupName;
        code: string;
        testDb?: boolean;
    }) {
        const translator = await TranslationsService.translator({ localeId, groupName, prefix: code, testDb });
        return translator.translated(code);
    }
}
