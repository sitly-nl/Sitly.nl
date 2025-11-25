import { Translation } from '../../services/translations.service';
import { TranslationValue } from '../translation/translation-value.model';
import { Serializer as JSONAPISerializer } from 'jsonapi-serializer';

class TranslationResponseGem {
    static keys: (keyof TranslationResponseGem)[] = [
        'id',
        'localeId',
        'countryId',
        'translationCodeId',
        'valueDevelopment',
        'valueAcceptance',
        'valueProduction',
        'translationCode',
        'groupName',
    ];

    id = this.model.translation_value_id;
    localeId = this.model.locale_id;
    countryId = this.model.country_id;
    translationCodeId = this.model.translation_code_id;
    valueDevelopment = this.model.value_development;
    valueAcceptance = this.model.value_acceptance;
    valueProduction = this.model.value_production;
    translationCode = this.model.code.translation_code;
    groupName = this.model.code.group.group_name;

    private constructor(private model: TranslationValue) {}

    static instance(model: TranslationValue) {
        return new TranslationResponseGem(model);
    }
}

class TranslationResponseWebApp {
    static keys: (keyof TranslationResponseWebApp)[] = ['id', 'value'];

    id = this.model.code;
    value = this.model.value;

    private constructor(private model: Translation) {}

    static instance(model: Translation) {
        return new TranslationResponseWebApp(model);
    }
}

export const serializeForGem = (model: TranslationValue | TranslationValue[], meta?: { totalCount: number; totalPages: number }) => {
    const serializer = new JSONAPISerializer('translations', {
        attributes: TranslationResponseGem.keys,
        keyForAttribute: 'camelCase',
        ...(meta ? { meta } : {}),
    });
    return serializer.serialize(
        Array.isArray(model) ? model.map(item => TranslationResponseGem.instance(item)) : TranslationResponseGem.instance(model),
    );
};

export const serializeForWebApp = (model: Translation[]) => {
    const serializer = new JSONAPISerializer('translations', {
        attributes: TranslationResponseWebApp.keys,
        keyForAttribute: 'camelCase',
    });
    return serializer.serialize(model.map(item => TranslationResponseWebApp.instance(item)));
};
