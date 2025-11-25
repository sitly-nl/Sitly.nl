import { Country } from '../gem/country.model';
import { Serializer as JSONAPISerializer } from 'jsonapi-serializer';
import { TranslationsService, Translator } from '../../services/translations.service';
import { LocaleId } from '../locale.model';
import { BrandCode } from '../brand-code';

export class GemCountryResponse {
    static keys: (keyof GemCountryResponse)[] = ['id', 'countryCode'];

    id = this.country.country_id;
    countryCode = this.country.country_code;

    private constructor(private country: Country) {}

    static instance(country: Country) {
        return new GemCountryResponse(country);
    }
}

interface SitlyCountry {
    country_code: BrandCode;
}

export class CountryResponse {
    static keys: (keyof CountryResponse)[] = ['countryCode', 'name'];

    id = this.country.country_code;
    countryCode = this.country.country_code;
    name = this.translator.translated(`country.${this.country.country_code}`);

    private constructor(
        private country: SitlyCountry,
        private translator: Translator,
    ) {}

    static instance(country: SitlyCountry, translator: Translator) {
        return new CountryResponse(country, translator);
    }
}

const serializer = new JSONAPISerializer('countries', {
    attributes: CountryResponse.keys,
    keyForAttribute: 'camelCase',
});

export const serializeCountry = async (models: SitlyCountry[], localeId: LocaleId) => {
    const translator = await TranslationsService.translator({ localeId, groupName: 'api', prefix: 'country.' });
    return serializer.serialize(models.map(item => CountryResponse.instance(item, translator)));
};
