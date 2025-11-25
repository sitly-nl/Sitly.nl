import { CountryCode } from './../../models/brand-code';
import { AddressGeoInterface } from './geocode.service';
import * as stringSimilarity from 'string-similarity';
import * as request from 'request';
import { stringify, ParsedUrlQueryInput } from 'querystring';
import { GeocodeParserInterface, GeocodeProvider } from './geocode-parser-interface';
import { GeocodeInterface, GeocodeRequestParams } from './geocode-interface';
import { Environment } from '../env-settings.service';

interface LocationIQResponseAddressDetails {
    country: 'string';
    city?: 'string';
    state?: 'string';
    postcode?: 'string';
    house_number?: 'string';
    road?: 'string';
    cycleway?: 'string';
    country_code?: 'string';
    pedestrian?: 'string';
    footway?: 'string';
    path?: 'string';
    sidewalk?: 'string';
    steps?: 'string';
}

interface LocationIQResponseAddress {
    address: LocationIQResponseAddressDetails;
    lat: string;
    lon: string;
    osm_type: string;
    boundingbox: number[];
    matchquality: { matchcode: string };
}

interface LocationIQResponseArray {
    results?: LocationIQResponseAddress[];
    usedUrl: string;
    error?: unknown;
}

export class LocationIQGeocode implements GeocodeInterface<LocationIQGeocodeParser, LocationIQResponseArray> {
    private makeUrl(getParams: ParsedUrlQueryInput, type: 'forward' | 'reverse' = 'forward') {
        const queryString = stringify(getParams);
        const endpoint = type === 'forward' ? 'search' : 'reverse';
        return `https://eu1.locationiq.com/v1/${endpoint}.php?key=${Environment.apiKeys.location_iq}&format=json&${queryString}`;
    }

    private async makeRequest(
        getParams: {
            'country'?: string;
            'city'?: string;
            'street'?: string;
            'accept-language'?: string;
            'lat'?: number;
            'lon'?: number;
            'postalcode'?: string;
        },
        type: 'forward' | 'reverse' = 'forward',
    ): Promise<LocationIQResponseArray> {
        const fullUrl = this.makeUrl(
            {
                ...getParams,
                addressdetails: 1,
                matchquality: 1,
                normalizecity: 1,
                // namedetails: 1,
                countrycodes: getParams.country,
            },
            type,
        );
        return new Promise((resolve, reject) => {
            request
                .get(fullUrl, (error: Error, _response, body) => {
                    if (error) {
                        reject(error);
                    }

                    if (body) {
                        if (body.error) {
                            resolve({ results: undefined, usedUrl: fullUrl, error: body.error });
                        } else {
                            const results = Array.isArray(body) ? body : [body];
                            resolve({ results, usedUrl: fullUrl });
                        }
                    }
                })
                .json({});
        });
    }

    async geocodeAddress(country: string, placeName: string, streetName: string, houseNumber: string, locale: string, postalCode?: string) {
        const params: Record<string, unknown> = {
            country,
            'city': placeName,
            'street': `${streetName}${houseNumber ? ', ' + houseNumber : ''}`,
            'accept-language': locale.replace('_', '-'),
        };
        if (postalCode) {
            params.postalcode = postalCode;
        }
        return this.makeRequest(params);
    }

    async reverse(latitude: number, longitude: number) {
        const result = await this.makeRequest({ lat: latitude, lon: longitude }, 'reverse');
        const parser = new LocationIQGeocodeParser(result);

        const parsedStreetName = parser.getStreetName();
        const parsedPlaceName = parser.getPlaceName();
        const parsedPostalCode = parser.getPostalCode();
        const parsedHouseNumber = parser.getHouseNumber() ?? '';
        const parsedCountryCode = parser.getCountryCode();
        const found = !!(parsedStreetName && parsedPlaceName);

        const parsedLatitude = !found ? undefined : parser.getLatitude();
        const parsedLongitude = !found ? undefined : parser.getLongitude();

        const parsedIsSuggestion = parser.getIsSuggestion() && found;

        const ret: AddressGeoInterface = {
            latitude: parsedLatitude,
            longitude: parsedLongitude,
            isSuggestion: parsedIsSuggestion,
            placeName: parsedPlaceName,
            streetName: parsedStreetName,
            postalCode: parsedPostalCode,
            houseNumber: parsedHouseNumber,
            countryCode: parsedCountryCode,
            found,
            geocodeResult: result,
            geocodeProvider: parser.provider,
        };

        return ret;
    }

    getParser(countryCode: CountryCode, geocodeResult: LocationIQResponseArray, requestParams: GeocodeRequestParams) {
        let parser;
        if (countryCode === CountryCode.brazil) {
            parser = new BrazilLocationIQGeocodeParser(geocodeResult);
        } else {
            parser = new LocationIQGeocodeParser(geocodeResult);
        }
        parser.setRequestParams(requestParams);
        return parser;
    }
}

export class LocationIQGeocodeParser implements GeocodeParserInterface {
    provider = GeocodeProvider.locationIQ;
    protected requestParams: Partial<GeocodeRequestParams> = {};

    constructor(public geoResult: LocationIQResponseArray) {}

    setRequestParams(requestParams: GeocodeRequestParams) {
        this.requestParams = requestParams;
    }
    private getBestResult() {
        return this.geoResult?.results?.[0];
    }

    getStreetName() {
        const streetName =
            this.getBestResult()?.address?.road ??
            this.getBestResult()?.address?.cycleway ??
            this.getBestResult()?.address?.pedestrian ??
            this.getBestResult()?.address?.footway ??
            this.getBestResult()?.address?.path ??
            this.getBestResult()?.address?.sidewalk ??
            this.getBestResult()?.address?.steps;
        return streetName as string | undefined;
    }

    getCountryCode() {
        const countryCode = this.getBestResult()?.address?.country_code;
        return countryCode?.toLowerCase() as CountryCode | undefined;
    }

    getPlaceName() {
        const placeKeys = ['city', 'town', 'hamlet', 'village', 'county'] as (keyof LocationIQResponseAddressDetails)[];

        const bestResultAddress = this.getBestResult()?.address;
        const placeNames = placeKeys.map(key => bestResultAddress?.[key] ?? '');
        if (this.requestParams.placeName) {
            const bestMatch = stringSimilarity.findBestMatch(this.requestParams.placeName, placeNames);
            return bestMatch.bestMatch.target;
        } else {
            return placeNames.filter(Boolean)[0];
        }
    }
    getPostalCode() {
        const bestResult = this.getBestResult();
        return bestResult?.address?.postcode;
    }
    getHouseNumber() {
        const bestResult = this.getBestResult();
        return bestResult?.address?.house_number as string | undefined;
    }

    getPlaceBounds() {
        const boundingBox = this.getBestResult()?.boundingbox ?? [];
        if (boundingBox.length > 0) {
            return {
                north: +boundingBox[1],
                east: +boundingBox[3],
                south: +boundingBox[0],
                west: +boundingBox[2],
            };
        } else if (this.getLatitude()) {
            const delta = 0.01;
            return {
                north: (this.getLatitude() ?? 0) + delta,
                east: (this.getLongitude() ?? 0) + delta,
                south: (this.getLatitude() ?? 0) - delta,
                west: (this.getLongitude() ?? 0) - delta,
            };
        }

        return undefined;
    }

    getLatitude() {
        const lat = this.getBestResult()?.lat;
        return lat ? parseFloat(lat) : undefined;
    }
    getLongitude() {
        const lon = this.getBestResult()?.lon;
        return lon ? parseFloat(lon) : undefined;
    }

    getStreetBounds() {
        const isStreet = this.getBestResult()?.osm_type === 'way';
        if (isStreet) {
            return this.getBestResult()?.boundingbox;
        }
    }

    getIsSuggestion() {
        return this.getBestResult()?.matchquality?.matchcode === 'approximate';
    }

    getUsedUrl() {
        return this.geoResult.usedUrl;
    }
}

export class BrazilLocationIQGeocodeParser extends LocationIQGeocodeParser {
    getPlaceName() {
        if (this.requestParams.placeName === 'Brasília') {
            return 'Brasília';
        } else {
            return super.getPlaceName();
        }
    }
    getStreetName() {
        if (this.requestParams.placeName === 'Brasília') {
            return this.requestParams.streetName;
        } else {
            return super.getStreetName();
        }
    }

    getHouseNumber() {
        if (this.requestParams.placeName === 'Brasília') {
            return this.requestParams.houseNumber;
        } else {
            return super.getHouseNumber();
        }
    }
}
