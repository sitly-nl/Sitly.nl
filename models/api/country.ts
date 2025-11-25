import { BaseApiModel } from 'app/models/api/response';

export type CountryCode = 'ar' | 'be' | 'br' | 'ca' | 'co' | 'de' | 'dk' | 'es' | 'fi' | 'it' | 'mx' | 'my' | 'nl' | 'no';

export class Country extends BaseApiModel {
    countryCode: CountryCode;
    name: string;
}
