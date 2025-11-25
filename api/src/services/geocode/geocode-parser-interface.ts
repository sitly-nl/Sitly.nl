import { GeocodeRequestParams } from './geocode-interface';
import { BoundsInterface } from './geocode.service';
export enum GeocodeProvider {
    google = 'google',
    mapbox = 'mapbox',
    locationIQ = 'locationIQ',
    here = 'here',
}
export interface GeocodeParserInterface {
    provider: GeocodeProvider;
    geoResult: unknown;

    setRequestParams(requestParams: GeocodeRequestParams): void;
    getPlaceId?(): string | undefined;
    getStreetBounds(): number[] | undefined;
    getStreetName(): string | undefined;
    getPlaceName(): string | undefined;
    getRegionName?(): string | undefined;
    getPostalCode?(): string | undefined;
    getHouseNumber(): string | undefined;
    getPlaceBounds(): BoundsInterface | undefined;
    getLatitude(): number | undefined;
    getLongitude(): number | undefined;
    getIsSuggestion(): boolean | undefined;
    getUsedUrl(): string | undefined;
}
