import { AddressGeoInterface } from './geocode.service';
import * as stringSimilarity from 'string-similarity';
import { GeocodeInterface, GeocodeRequestParams } from './geocode-interface';
import { CountryCode } from '../../models/brand-code';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const mbxClient = require('@mapbox/mapbox-sdk');
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');

export class MapboxGeocode implements GeocodeInterface<MapboxGeocodeParser, unknown> {
    private mapbox;

    constructor(mapboxAccessToken: string) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        this.mapbox = mbxGeocoding(mbxClient({ mapboxAccessToken }));
    }

    geocodeAddress(country: string, placeName: string, streetName: string, houseNumber: string, locale?: string, _postalCode?: string) {
        let query: string;
        let types: string[];
        if (streetName || houseNumber) {
            query = `${placeName}, ${streetName} ${houseNumber}`;
            types = ['address'];
        } else {
            query = placeName;
            types = ['place'];
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        return this.mapbox
            .forwardGeocode({
                query,
                countries: [country],
                types,
                language: [locale],
            })
            .send() as Promise<unknown>;
    }

    getParser(_countryCode: CountryCode, _geocodeResult: unknown, _requestParams: GeocodeRequestParams): MapboxGeocodeParser | undefined {
        return undefined;
    }
}

export interface MapboxFeature {
    id: string;
    context?: { text: string; id: string }[];
    relevance: number;
    place_type?: unknown[];
    text: string;
    address?: string;
    bbox?: number[];
    center?: number[];
}

export class MapboxGeocodeParser {
    private features: MapboxFeature[];

    constructor(
        geoResult: AddressGeoInterface,
        private contextPlaceName?: string,
    ) {
        this.features = (geoResult?.body?.features ?? []).filter(feature => feature.relevance > 0.68);
    }

    getFeature() {
        const firstFeature = this.features?.[0];
        if (!this.contextPlaceName) {
            return firstFeature;
        }
        const getPlaceNameContext = (contextItem: { id: string }) => contextItem.id.startsWith('place');
        if (firstFeature?.context?.find(getPlaceNameContext)?.text === this.contextPlaceName) {
            return firstFeature;
        }
        const getPlaceName = (feature: MapboxFeature) => {
            const placeNameContext = (feature?.context ?? []).find(getPlaceNameContext);
            if (placeNameContext) {
                return placeNameContext.text;
            }
        };
        const placeNames = this.features.map(getPlaceName).filter(item => item !== undefined);
        const bestMatch = stringSimilarity.findBestMatch(this.contextPlaceName, placeNames);

        return this.features.find(feature => getPlaceName(feature) === bestMatch.bestMatch.target);
    }

    getStreetName() {
        const feature = this.getFeature();
        if ((feature?.place_type ?? []).includes('address')) {
            return feature?.text;
        }
    }

    getPlaceName() {
        if (this.features.length) {
            let name: string | undefined;
            const place = (this.getFeature()?.context ?? []).find(contextItem => contextItem.id.startsWith('place'));
            if (place) {
                name = place?.text;
            }
            if (!name) {
                name = this.getFeature()?.text;
            }
            return name;
        }
    }

    getRegionName() {
        if (this.features.length) {
            let name: string | undefined;
            const place = (this.getFeature()?.context ?? []).find(contextItem => contextItem.id.startsWith('region'));
            if (place) {
                name = place?.text;
            }
            if (!name) {
                name = this.getFeature()?.text;
            }
            return name;
        }
    }

    getHouseNumber() {
        if (this.features.length) {
            return this.getFeature()?.address;
        }
    }

    getPlaceBounds() {
        const feature = this.getFeature();
        const bbox = feature?.bbox ?? [];
        if (bbox.length > 0) {
            return {
                north: bbox[3],
                east: bbox[2],
                south: bbox[1],
                west: bbox[0],
            };
        } else {
            const center = feature?.center ?? [];
            if (center?.length > 1) {
                const delta = 0.01;
                return {
                    north: center[1] + delta,
                    east: center[0] + delta,
                    south: center[1] - delta,
                    west: center[0] - delta,
                };
            }
        }
        return null;
    }

    getLatitude() {
        return this.getFeature()?.center?.[1];
    }

    getLongitude() {
        return this.getFeature()?.center?.[0];
    }

    getIsSuggestion() {
        return (this.getFeature()?.relevance ?? 0) < 0.8;
    }
}
