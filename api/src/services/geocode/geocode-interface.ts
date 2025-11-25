import { CountryCode } from '../../models/brand-code';

export interface GeocodeRequestParams {
    placeName: string;
    streetName: string;
    houseNumber: string;
    language: string;
}

export interface GeocodeInterface<Parser, Response> {
    geocodeAddress(
        country: string,
        placeName: string,
        streetName: string,
        houseNumber: string,
        locale?: string,
        postalCode?: string,
    ): Promise<Response>;

    getParser(countryCode: CountryCode, geocodeResult: Response, requestParams: GeocodeRequestParams): Parser | undefined;
}
