import { AddressComponent, AddressGeoInterface } from './geocode.service';
import { createClient, GoogleMapsClientWithPromise, Language } from '@google/maps';
import { GeocodeParserInterface, GeocodeProvider } from './geocode-parser-interface';
import { CountryCode } from '../../models/brand-code';
import { GeocodeInterface, GeocodeRequestParams } from './geocode-interface';
import { Environment } from '../env-settings.service';

interface GoogleGeocodeResponse {
    json: {
        results: {
            partial_match: boolean;
            address_components: AddressComponent[];
            place_id: string;
            geometry: {
                viewport: {
                    northeast: {
                        lat: number;
                        lng: number;
                    };
                    southwest: {
                        lat: number;
                        lng: number;
                    };
                };
                location: {
                    lat: number;
                    lng: number;
                };
            };
        }[];
    };
}

export class GoogleGeocode implements GeocodeInterface<GoogleGeocodeParser, GoogleGeocodeResponse> {
    private google: GoogleMapsClientWithPromise;
    private countryCode: string;

    constructor(countryCode: string) {
        this.google = createClient({
            key: Environment.apiKeys.google_maps,
            Promise,
        });
        this.countryCode = countryCode;
    }

    geocodeAddress(country: string, placeName: string, streetName: string, houseNumber: string, locale?: string, _postalCode?: string) {
        return this.google
            .geocode({
                address: `${streetName} ${houseNumber ? houseNumber + ', ' : ''}${placeName}`,
                components: {
                    country,
                },
                language: locale,
            })
            .asPromise();
    }
    geocodePostalCode(country: string, postalCode: string, houseNumber?: string, locale?: string) {
        return this.google
            .geocode({
                address: `${postalCode}-${houseNumber}`,
                components: {
                    country,
                },
                language: locale,
            })
            .asPromise();
    }

    getPlaceNameByPostalCode(postalCode: string) {
        const result = this.google
            .geocode({
                components: {
                    postal_code: postalCode,
                    country: this.countryCode,
                },
                language: this.countryCode,
            })
            .asPromise()
            .then(result => {
                const placeKeys = ['locality', 'administrative_area_level_2'];
                const components = <Array<AddressComponent>>result?.json?.results?.[0]?.address_components;
                if (components) {
                    for (const placeKey of placeKeys) {
                        for (const component of components) {
                            if (component.types.indexOf(placeKey) >= 0) {
                                return component.long_name;
                            }
                        }
                    }
                }
            });
        return result;
    }

    getCoordsByPostalCode(postalCode: string) {
        return this.google
            .geocode({
                components: {
                    postal_code: postalCode,
                    country: this.countryCode,
                },
            })
            .asPromise()
            .then(result => {
                const location = result?.json?.results?.[0]?.geometry?.location;
                const bounds = result?.json?.results?.[0]?.geometry?.bounds;
                return {
                    center: location,
                    bounds,
                };
            });
    }

    async geocodePlaceName(placeName: string, locale?: string, hints?: string) {
        const language = locale ?? this.countryCode;
        const checkPlaceName = hints ? `${placeName}, ${hints}` : placeName;
        const placeGeo = await this.google
            .geocode({
                address: checkPlaceName,
                components: {
                    country: this.countryCode,
                },
                language,
            })
            .asPromise();

        const parser = new GoogleGeocodeParser(placeGeo);

        const parsedPlaceName = parser.getPlaceName();
        if (!parsedPlaceName) {
            return undefined;
        }
        return {
            latitude: parser.getLatitude(),
            longitude: parser.getLongitude(),
            placeName: parsedPlaceName,
            geocodeResult: placeGeo,
        };
    }

    async reverse(latitude: number, longitude: number, locale?: string) {
        const result = await this.google
            .reverseGeocode({
                latlng: `${latitude},${longitude}`,
                language: locale as Language,
            })
            .asPromise();
        const parser = new GoogleGeocodeParser(result);

        const parsedStreetName = parser.getStreetName();
        const parsedPlaceName = parser.getPlaceName();
        const parsedPostalCode = parser.getPostalCode();
        const parsedHouseNumber = parser.getHouseNumber() ?? '1';
        const parsedCountryCode = parser.getCountryCode();

        const found = !!(parsedStreetName && parsedPlaceName && parsedHouseNumber);

        const parsedLatitude = !found ? undefined : parser.getLatitude();
        const parsedLongitude = !found ? undefined : parser.getLongitude();

        const parsedIsSuggestion = parser.getIsSuggestion() && found;

        const ret: AddressGeoInterface = {
            latitude: parsedLatitude,
            longitude: parsedLongitude,
            isSuggestion: parsedIsSuggestion,
            countryCode: parsedCountryCode,
            placeName: parsedPlaceName,
            streetName: parsedStreetName,
            postalCode: parsedPostalCode,
            houseNumber: parsedHouseNumber,
            found,
            geocodeResult: result,
            geocodeProvider: parser.provider,
        };

        return ret;
    }

    getParser(countryCode: CountryCode, geocodeResult: GoogleGeocodeResponse, requestParams: GeocodeRequestParams) {
        let parser;
        if (countryCode === CountryCode.brazil) {
            parser = new BrazilGoogleGeocodeParser(geocodeResult);
        } else if (countryCode === CountryCode.malaysia) {
            parser = new MalaysiaGoogleGeocodeParser(geocodeResult);
        } else {
            parser = new GoogleGeocodeParser(geocodeResult);
        }
        parser.setRequestParams(requestParams);
        return parser;
    }
}

export class GoogleGeocodeParser implements GeocodeParserInterface {
    provider = GeocodeProvider.google;
    protected components;
    protected placeId: string;
    protected requestParams: Partial<GeocodeRequestParams> = {};

    constructor(public geoResult: GoogleGeocodeResponse) {
        this.components = geoResult?.json?.results?.[0]?.address_components;
        this.placeId = geoResult?.json?.results?.[0]?.place_id;
    }

    setRequestParams(requestParams: GeocodeRequestParams) {
        this.requestParams = requestParams;
    }

    getPlaceId() {
        return this.placeId;
    }

    getCountryCode() {
        if (this.components) {
            const countryComponent = this.components.find(component => component.types.includes('country'));
            const countryCode = countryComponent?.short_name;
            return countryCode?.toLowerCase() as CountryCode;
        }
    }

    getStreetBounds(): number[] | undefined {
        return undefined;
    }

    getStreetName() {
        if (this.components) {
            const streetNameComponent = this.components.find(component => component.types.includes('route'));
            return streetNameComponent?.long_name;
        }
    }

    getPlaceName() {
        if (this.components) {
            return ['locality', 'postal_town', 'administrative_area_level_2']
                .map(placeType => this.components.find(component => component.types.includes(placeType)))
                .filter(type => !!type)
                .shift()?.long_name;
        }
    }
    getRegionName() {
        if (this.components) {
            return ['administrative_area_level_2']
                .map(placeType => this.components.find(component => component.types.includes(placeType)))
                .filter(type => !!type)
                .shift()?.long_name;
        }
    }

    getPostalCode() {
        if (this.components) {
            const byPostalCodeType = (component: { types: string[] }) => component.types.includes('postal_code');
            const postalCodeComponent = this.components.find(byPostalCodeType);
            const postalCodeValue = postalCodeComponent?.long_name;

            if (postalCodeValue) {
                return postalCodeValue;
            }
        }
    }
    getHouseNumber() {
        if (this.components) {
            const byHouseNumberType = (component: { types: string[] }) => component.types.includes('street_number');
            const streetNameComponent = this.components.find(byHouseNumberType);
            if (streetNameComponent) {
                const streetNameHouseNumber = streetNameComponent?.long_name;
                return streetNameHouseNumber;
            }
        }
    }

    getPlaceBounds() {
        const firstComponent = this.geoResult?.json?.results?.[0];
        if (firstComponent) {
            const bounds = firstComponent?.geometry?.viewport;
            return {
                north: bounds?.northeast?.lat,
                east: bounds?.northeast?.lng,
                south: bounds?.southwest?.lat,
                west: bounds?.southwest?.lng,
            };
        }
        return undefined;
    }

    getLatitude() {
        return this.geoResult?.json?.results?.[0]?.geometry?.location.lat;
    }

    getLongitude() {
        return this.geoResult?.json?.results?.[0]?.geometry?.location.lng;
    }

    getIsSuggestion() {
        return !!this.geoResult?.json?.results?.[0]?.partial_match;
    }
    getUsedUrl() {
        return '';
    }
}

export class BrazilGoogleGeocodeParser extends GoogleGeocodeParser {
    getStreetName() {
        if (this.components) {
            const streetNameComponent = this.components.find(component => component.types.includes('route'));
            if (!streetNameComponent && this.requestParams.placeName === 'Brasília') {
                return this.requestParams.streetName;
            }
            return <string>streetNameComponent?.long_name;
        }
    }

    getHouseNumber() {
        if (this.components) {
            const streetNameComponent = this.components.find(component => component.types.includes('street_number'));
            if (streetNameComponent) {
                const streetNameHouseNumber = streetNameComponent?.long_name;
                return streetNameHouseNumber;
            } else if (this.requestParams.placeName === 'Brasília') {
                return this.requestParams.houseNumber;
            }
        }
    }
}
export class MalaysiaGoogleGeocodeParser extends GoogleGeocodeParser {
    getStreetName() {
        return this.requestParams.streetName;
    }

    getHouseNumber() {
        return this.requestParams.houseNumber;
    }

    getPlaceName() {
        return this.requestParams.placeName;
    }
}
