import { Locale } from '../locale.model';
import { Serializer as JSONAPISerializer } from 'jsonapi-serializer';

export class LocaleResponse {
    static keys: (keyof LocaleResponse)[] = ['code', 'name'];

    id = this.model.locale_id;
    code = this.model.locale_code;
    name = this.model.locale_name;

    private constructor(private model: Locale) {}

    static instance(model: Locale) {
        return new LocaleResponse(model);
    }
}

const serializer = new JSONAPISerializer('locales', {
    attributes: LocaleResponse.keys,
    keyForAttribute: 'camelCase',
});

export const serialize = (model: Locale | Locale[]) => {
    return serializer.serialize(Array.isArray(model) ? model.map(item => LocaleResponse.instance(item)) : LocaleResponse.instance(model));
};
