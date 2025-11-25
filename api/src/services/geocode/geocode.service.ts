import { optionalAwait, Util } from '../../utils/util';
import { GoogleGeocode, GoogleGeocodeParser } from './geocode-Google.service';
import { LocationIQGeocode } from './geocode-LocationIQ.service';
import { LogService } from '../log.service';
import { HereGeocode } from './geocode-Here.service';
import { GeocodeParserInterface, GeocodeProvider } from './geocode-parser-interface';
import { CountryCode } from '../../models/brand-code';
import { StringUtil } from '../../utils/string-util';
import { GeocodeInterface } from './geocode-interface';
import { MapboxFeature } from './geocode-MapBox.service';
import { CacheItem, CacheService } from '../cache.service';
import { LatLngLiteral, LatLngBounds } from '@google/maps';

export interface AddressComponent {
    types: Array<string>;
    long_name: string;
    short_name: string;
}

export interface AddressGeoInterface {
    latitude?: number;
    longitude?: number;
    countryCode?: CountryCode;
    placeName?: string;
    streetName?: string;
    postalCode?: string;
    houseNumber?: string;
    isSuggestion: boolean;
    found: boolean;
    geocodeResult?: unknown;
    placeBounds?: BoundsInterface;
    usedUrl?: string;
    geocodeProvider?: string;
    body?: { features: MapboxFeature[] };
}

export interface PlaceGeoInterface {
    latitude: number;
    longitude: number;
    placeName: string;
    found: boolean;
    geocodeResult?: unknown;
}

export interface BoundsInterface {
    north: number;
    east: number;
    south: number;
    west: number;
}

export class GeocodeService {
    private locationIQGeocode: LocationIQGeocode;
    private googleGeocode: GoogleGeocode;
    private hereGeocode: HereGeocode;

    constructor(private countryCode: CountryCode) {
        this.locationIQGeocode = new LocationIQGeocode();
        this.googleGeocode = new GoogleGeocode(this.countryCode);
        this.hereGeocode = new HereGeocode();
    }

    async geocodeAddress(placeName: string, streetName: string, houseNumber: string, postalCode?: string, locale?: string) {
        const language = locale ?? this.countryCode;

        let geocodeType: 'here' | 'google' | 'localIq';
        if (['CO', 'MX'].includes(this.countryCode.toUpperCase())) {
            geocodeType = 'here';
        } else if (['MY', 'CA'].includes(this.countryCode.toUpperCase())) {
            geocodeType = 'google';
        } else {
            geocodeType = 'localIq';
        }
        const houseNumberRequired = !['CO'].includes(this.countryCode.toUpperCase());

        let houseNumberFound = false;

        const geocodeWithProvider = async (geocoder: GeocodeInterface<GeocodeParserInterface, unknown>, isRetry = false) => {
            const geoResult = await geocoder.geocodeAddress(this.countryCode, placeName, streetName, houseNumber, language, postalCode);
            const parser = geocoder.getParser(this.countryCode, geoResult, {
                placeName,
                streetName,
                houseNumber,
                language,
            });

            await optionalAwait(
                LogService.logGeo(
                    parser?.provider ?? '-',
                    'address',
                    this.countryCode,
                    `${placeName} : ${streetName} : ${houseNumber}`,
                    isRetry,
                ),
            );

            return parser;
        };
        let parser: GeocodeParserInterface | undefined;
        let parsedPlaceName: string | undefined;
        let parsedStreetName: string | undefined;
        let parsedHouseNumber: string | undefined;

        let geocoder: LocationIQGeocode | HereGeocode | undefined;
        if (geocodeType === 'here') {
            geocoder = this.hereGeocode;
        } else if (geocodeType === 'localIq') {
            geocoder = this.locationIQGeocode;
        }
        if (geocoder) {
            parser = await geocodeWithProvider(geocoder);
            const isLocationIQ = parser?.provider === GeocodeProvider.locationIQ;

            parsedPlaceName = parser?.getPlaceName();
            parsedStreetName = parser?.getStreetName();
            parsedHouseNumber = parser?.getHouseNumber();
            houseNumberFound = !!parsedHouseNumber;

            if (!parsedHouseNumber && isLocationIQ) {
                const streetBounds = parser?.getStreetBounds();
                if (streetBounds) {
                    const [south, north, west, east] = parser?.getStreetBounds() ?? [];
                    const distance = Util.calculateDistanceInMeters(north, west, south, east);
                    if (distance < 500) {
                        houseNumberFound = true;
                        parsedHouseNumber = houseNumber;
                    }
                }
            }
        }

        // made it 2 separate statements to make it easier to understand
        const retryWithGoogle =
            geocodeType === 'google' || (houseNumberRequired && !houseNumberFound) || (!houseNumberRequired && !parsedStreetName);
        if (retryWithGoogle) {
            parser = await geocodeWithProvider(this.googleGeocode, geocodeType !== 'google');
        }

        let found = false;
        let parsedLatitude;
        let parsedLongitude;
        let parsedIsSuggestion;
        let placeBounds;
        let usedUrl;
        let geocodeProvider;

        if (parser) {
            parsedPlaceName = parser.getPlaceName();
            parsedStreetName = streetName?.length > 0 ? parser.getStreetName() : undefined;
            parsedHouseNumber = parsedHouseNumber ?? parser.getHouseNumber();
            parsedLatitude = parser.getLatitude();
            parsedLongitude = parser.getLongitude();
            found = !!(parsedPlaceName && parsedStreetName && parsedLatitude);
            parsedLatitude = !found ? undefined : parsedLatitude;
            parsedLongitude = !found ? undefined : parsedLongitude;
            parsedIsSuggestion = parser.getIsSuggestion() && found;
            placeBounds = parser.getPlaceBounds();
            usedUrl = parser.getUsedUrl();
            geocodeProvider = parser.provider;
        }

        const ret: AddressGeoInterface = {
            latitude: parsedLatitude,
            longitude: parsedLongitude,
            isSuggestion: parsedIsSuggestion ?? false,
            placeName: parsedPlaceName,
            streetName: parsedStreetName,
            houseNumber: parsedHouseNumber,
            found,
            geocodeResult: parser?.geoResult,
            placeBounds,
            usedUrl,
            geocodeProvider,
        };
        return ret;
    }

    async geocodePostalCode(postalCode: string, houseNumber?: string, locale?: string) {
        const language = locale ?? this.countryCode;
        LogService.logGeo(GeocodeProvider.google, 'postalcode', this.countryCode, `${postalCode} ${houseNumber}`, false);

        const googleResult = await this.googleGeocode.geocodePostalCode(this.countryCode, postalCode, houseNumber, language);

        const parser = new GoogleGeocodeParser(googleResult);
        const parsedPlaceName = parser.getPlaceName();
        const parsedPostalCode = parser.getPostalCode();
        const parsedHouseNumber = parser.getHouseNumber();
        const found = !!parsedPlaceName && !!parsedPostalCode;
        const parsedLatitude = !found ? undefined : parser.getLatitude();
        const parsedLongitude = !found ? undefined : parser.getLongitude();

        const parsedIsSuggestion = parser.getIsSuggestion() && found;
        const ret: AddressGeoInterface = {
            latitude: parsedLatitude,
            longitude: parsedLongitude,
            isSuggestion: parsedIsSuggestion,
            placeName: parsedPlaceName,
            postalCode: parsedPostalCode,
            houseNumber: parsedHouseNumber,
            found,
            geocodeResult: googleResult,
            placeBounds: parser.getPlaceBounds(),
            geocodeProvider: parser.provider,
        };
        return ret;
    }

    getPlaceNameByPostalCode(postalCode: string) {
        LogService.logGeo(GeocodeProvider.google, 'placename-by-postalcode', this.countryCode, `${postalCode}`, false);

        return this.googleGeocode.getPlaceNameByPostalCode(postalCode);
    }

    async getCoordsByPostalCode(postalCode: string) {
        const cache = await CacheService.getInstance(
            CacheItem.geocode({
                key: 'coordByPostalCode',
                countryCode: this.countryCode,
                postalCode: StringUtil.safeString(postalCode),
            }),
        );
        const cacheValue = await cache.get<{ center: LatLngLiteral; bounds: LatLngBounds }>();
        if (cacheValue) {
            return cacheValue;
        }
        await optionalAwait(LogService.logGeo(GeocodeProvider.google, 'coords-by-postalcode', this.countryCode, `${postalCode}`, false));
        const result = await this.googleGeocode.getCoordsByPostalCode(postalCode);
        cache.set(result);
        return result;
    }

    async geocodePlaceName(placeName: string, locale?: string, hints?: string) {
        await optionalAwait(LogService.logGeo(GeocodeProvider.google, 'placename', this.countryCode, `${placeName}`, false));
        return this.googleGeocode.geocodePlaceName(placeName, locale, hints);
    }

    getCoordsByPlaceName(placeName: string) {
        return this.geocodePlaceName(placeName).then(result => {
            const location = result?.geocodeResult?.json?.results?.[0]?.geometry?.location;
            const bounds = result?.geocodeResult?.json?.results?.[0]?.geometry?.bounds;

            if (bounds && location) {
                return {
                    center: location,
                    bounds,
                };
            }
        });
    }

    extendBounds(bounds: BoundsInterface, marginInKm: number) {
        const rate: Record<string, number> = {
            lat: 110.57,
            lng: 111.32,
        };

        const multipliers: Record<string, number> = {
            plus: 1,
            minus: -1,
        };

        const addKm = (coordinate: number, latOrLng: string, plusOrMinus: string) => {
            return coordinate + (marginInKm / 2 / rate[latOrLng]) * multipliers[plusOrMinus];
        };

        bounds.north = addKm(bounds.north, 'lat', 'plus');
        bounds.east = addKm(bounds.east, 'lng', 'plus');
        bounds.south = addKm(bounds.south, 'lat', 'minus');
        bounds.west = addKm(bounds.west, 'lng', 'minus');

        return bounds;
    }

    async reverse(latitude: number, longitude: number, locale?: string) {
        const googleGeocodeCountries = ['MY', 'CO', 'MX', 'CA'];
        if (googleGeocodeCountries.includes(this.countryCode.toUpperCase())) {
            const address = await this.googleGeocode.reverse(latitude, longitude, locale);
            LogService.logGeo(GeocodeProvider.google, 'reverse', this.countryCode, `${latitude},${longitude}`, false);
            if (address.countryCode && address.countryCode !== this.countryCode) {
                return undefined;
            }
            return address;
        } else {
            const address = await this.locationIQGeocode.reverse(latitude, longitude);
            LogService.logGeo(GeocodeProvider.locationIQ, 'reverse', this.countryCode, `${latitude},${longitude}`, false);
            if (address.countryCode && address.countryCode !== this.countryCode) {
                return undefined;
            }
            return address;
        }
    }
}
