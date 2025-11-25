import * as request from 'request';
import { stringify, ParsedUrlQueryInput } from 'querystring';
import { GeocodeParserInterface, GeocodeProvider } from './geocode-parser-interface';
import { CountryCode } from '../../models/brand-code';
import { GeocodeInterface, GeocodeRequestParams } from './geocode-interface';
import { Environment } from '../env-settings.service';

// todo country mappings ISO 2 <-> ISO 3
// https://github.com/vtex/country-iso-2-to-3/blob/master/index.js
interface HereResponseAddress {
    Location: {
        DisplayPosition: {
            Latitude: number;
            Longitude: number;
        };
        Address: {
            Country: string;
            County: string;
            City: string;
            District: string;
            Street: string;
            HouseNumber: string;
            PostalCode: string;
        };
        MapView: {
            TopLeft: {
                Latitude: number;
                Longitude: number;
            };
            BottomRight: {
                Latitude: number;
                Longitude: number;
            };
        };
    };
    Relevance: number;
}

interface HereResponse {
    results?: {
        Response: {
            View: {
                Result: HereResponseAddress[];
            }[];
        };
    };
    usedUrl: string;
    error?: unknown;
}

export class HereGeocode implements GeocodeInterface<HereGeocodeParser, HereResponse> {
    private makeUrl(getParams: ParsedUrlQueryInput) {
        const queryString = stringify(getParams);
        const fullUrl = `https://geocoder.ls.hereapi.com/6.2/geocode.json?apiKey=${Environment.apiKeys.here_geocoding}&${queryString}`;
        return fullUrl;
    }

    private async makeRequest(getParams: ParsedUrlQueryInput) {
        const fullUrl = this.makeUrl({
            ...getParams,
        });
        return new Promise<HereResponse>((resolve, reject) => {
            request
                .get(fullUrl, (error: Error, _response, body) => {
                    if (error) {
                        reject(error);
                    }

                    if (body) {
                        if (body.error) {
                            resolve({ results: undefined, usedUrl: fullUrl, error: body.error });
                        } else {
                            resolve({ results: body as never, usedUrl: fullUrl });
                        }
                    }
                })
                .json({});
        });
    }

    async geocodeAddress(
        country: string,
        placeName: string,
        streetName: string,
        houseNumber: string,
        locale?: string,
        _postalCode?: string,
    ) {
        const requestParams: ParsedUrlQueryInput = {
            country,
            'city': placeName,
            'street': `${streetName.replace('#', '@')}`, // intersections in HERE are specified with @
            'accept-language': locale?.replace('_', '-'),
        };

        if (houseNumber) {
            requestParams.housenumber = houseNumber;
        }
        return this.makeRequest(requestParams);
    }

    getParser(_countryCode: CountryCode, geoResult: HereResponse, _requestParams: GeocodeRequestParams) {
        return new HereGeocodeParser(geoResult);
    }
}

export class HereGeocodeParser implements GeocodeParserInterface {
    provider = GeocodeProvider.here;
    protected requestParams: Partial<GeocodeRequestParams> = {};

    constructor(public geoResult: HereResponse) {}

    setRequestParams(requestParams: GeocodeRequestParams) {
        this.requestParams = requestParams;
    }

    private getBestResult() {
        return this.geoResult.results?.Response?.View[0]?.Result[0];
    }

    getStreetName() {
        const bestResult = this.getBestResult();
        return bestResult?.Location?.Address?.Street;
    }

    getPlaceName() {
        const bestResult = this.getBestResult();
        return bestResult?.Location?.Address?.City;
    }

    getHouseNumber() {
        const bestResult = this.getBestResult();
        return bestResult?.Location?.Address?.HouseNumber;
    }

    getStreetBounds(): number[] | undefined {
        return undefined;
    }

    getPlaceBounds() {
        const bestResult = this.getBestResult();
        const boundingBox = bestResult?.Location?.MapView;
        if (boundingBox) {
            return {
                north: boundingBox.TopLeft.Latitude,
                east: boundingBox.BottomRight.Longitude,
                south: boundingBox.BottomRight.Latitude,
                west: boundingBox.TopLeft.Longitude,
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
        const bestResult = this.getBestResult();
        return bestResult?.Location?.DisplayPosition?.Latitude;
    }
    getLongitude() {
        const bestResult = this.getBestResult();
        return bestResult?.Location?.DisplayPosition?.Longitude;
    }

    getIsSuggestion() {
        return (this.getBestResult()?.Relevance ?? 0) > 0.7;
    }

    getUsedUrl() {
        return '';
    }
}
