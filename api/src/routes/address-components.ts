import { StringUtil } from '../utils/string-util';
import { config } from './../../config/config';
import { Serializer as JSONAPISerializer } from 'jsonapi-serializer';
import { NextFunction, Request, Response } from 'express';
import { BaseRoute } from './route';
import * as request_ from 'request';
import { GeocodeService } from '../services/geocode/geocode.service';
import { ParsedQs, stringify } from 'qs';
import * as stringSimilarity from 'string-similarity';
import { remove as removeDiacritics } from 'diacritics';
import { Environment } from '../services/env-settings.service';
import { BrandCode, brandCodeToCountryCode, CountryCode } from '../models/brand-code';
import { notFoundError } from '../services/errors';
import { MapboxFeature } from '../services/geocode/geocode-MapBox.service';
import { request } from '../utils/util';
import { SitlyRouter } from './sitly-router';
import { CacheItem, CacheService } from '../services/cache.service';
import { getModels } from '../sequelize-connections';
import { Province } from '../models/province.model';

const provinceSerializer = new JSONAPISerializer('province-address-component', {
    attributes: ['name', 'default'],
    keyForAttribute: 'camelCase',
    transform: (item: Province & { default: boolean }) => {
        return {
            id: item.province_url,
            name: item.province_name,
            default: !!item.default,
        };
    },
});

const mapBoxPlaceSerializer = new JSONAPISerializer('place-address-component', {
    attributes: ['name', 'latitude', 'longitude'],
    keyForAttribute: 'camelCase',
});

const mapBoxStreetSerializer = new JSONAPISerializer('street-address-component', {
    attributes: ['name', 'streetName', 'placeName'],
    keyForAttribute: 'camelCase',
    transform: (item: { id: string; context: { id: string[]; text: string }[]; text: string }) => {
        const placeNameContext = item.context.find(type => type.id.indexOf('place') === 0);
        const placeName = placeNameContext?.text ?? '';
        return {
            id: item.id,
            name: item.text,
            streetName: item.text,
            placeName,
        };
    },
});

const streetSerializer = new JSONAPISerializer('street-address-component', {
    attributes: ['name', 'streetName', 'placeName', 'province'],
    keyForAttribute: 'camelCase',
    transform: (item: { name: string; placeName: string; province: string }) => {
        return {
            ...item,
            streetName: item.name,
        };
    },
});
const fullAddressSerializer = new JSONAPISerializer('street-address-component', {
    attributes: ['latitude', 'longitude', 'isSuggestion', 'placeName', 'streetName', 'postalCode', 'houseNumber', 'found'],
    keyForAttribute: 'camelCase',
    transform: (item: Record<string, unknown>) => {
        item.id = item.id || 1;
        return item as unknown;
    },
    meta: {
        geocodeProvider: (item: { geocodeProvider: unknown }) => item.geocodeProvider,
    },
});

const encodeIfNotEncoded = (str: string) => {
    if (!str.includes('%')) {
        return encodeURIComponent(str);
    }
    return str;
};

const buildMapBoxUrl = (
    accessToken: string,
    type: 'address' | 'place',
    province: string | undefined,
    place: string | undefined,
    keyword: string,
    countryCode: CountryCode,
    localeCode: string,
    proximity?: string,
    // eslint-disable-next-line max-params
) => {
    const mapBoxBaseUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

    let prefix;
    if (type === 'place') {
        prefix = province ? `${encodeIfNotEncoded(province)}, ` : '';
    } else if (type === 'address' && place) {
        prefix = province ? `${encodeIfNotEncoded(province)}, ${encodeIfNotEncoded(place)} ` : encodeIfNotEncoded(place);
    }
    const placeUrl = `${mapBoxBaseUrl}/${prefix}, ${encodeIfNotEncoded(keyword)}.json`;
    const requestParams = {
        access_token: accessToken,
        country: countryCode,
        types: type,
        autocomplete: 'true',
        language: localeCode,
        ...(proximity ? { proximity } : {}),
    };

    const fullUrl = `${placeUrl}?${stringify(requestParams)}`;
    return fullUrl;
};

const parseMapBoxStreetsResponse = (mapBoxResponse: unknown, place: string, addressComponentAliases: string[][]) => {
    const mapBoxResponseParesed = JSON.parse(mapBoxResponse as string) as { features: MapboxFeature[] };
    let relevanceThreshold = 0.67;
    if (place.indexOf(' ') !== -1) {
        relevanceThreshold = 0.5;
    }
    const features = mapBoxResponseParesed.features ?? [];
    return features
        .filter(feature => {
            const featurePlace = feature.context?.find(contextItem => contextItem.id.startsWith('place'));
            if (!featurePlace) {
                return false;
            }
            const placeSimilarity = getAddressComponentSimilarity(place, featurePlace.text, addressComponentAliases);
            return placeSimilarity > 0.9;
        })
        .filter(feature => feature.relevance > relevanceThreshold);
};

const getStreetsFromGoogle = async (place: string, keyword: string, countryCode: string, localeCode: string, province?: string) => {
    const baseUrl = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
    const url = `${baseUrl}?type=address&key=${Environment.apiKeys.google_maps}&language=${localeCode}&input=${
        province ? `${removeDiacritics(province)}, ` : ''
    }${removeDiacritics(encodeIfNotEncoded(place))}, ${removeDiacritics(encodeIfNotEncoded(keyword))}&components=country:${countryCode}`;
    return (await request({ url })).body as string;
};

const getAddressComponentSimilarity = (term: string, compare: string, addressComponentAliases: string[][] = [], threshold = 0.9) => {
    let similarity = stringSimilarity.compareTwoStrings(term, compare);
    if (similarity >= threshold) {
        return similarity;
    }

    if (addressComponentAliases.length) {
        const aliases = addressComponentAliases.find(aliasItem => aliasItem.includes(compare));
        if (aliases?.length) {
            for (const alias of aliases) {
                const aliasSimilarity = stringSimilarity.compareTwoStrings(term, alias);
                if (aliasSimilarity > similarity) {
                    similarity = aliasSimilarity;
                    if (similarity > threshold) {
                        return similarity;
                    }
                }
            }
        }
    }
    return similarity;
};

const parseGoogleStreetsResponse = (brandCode: BrandCode, googleResponse: string, keyword: string, place: string, province?: string) => {
    const parsedGoogleResponse = JSON.parse(googleResponse) as {
        predictions: {
            types: string[];
            terms: { value: string }[];
            id: unknown;
        }[];
    };
    const brandConfigSettings = config.getConfig(brandCode);

    const streets: string[] = [];
    const predictions = parsedGoogleResponse.predictions
        .map(prediction => {
            if (!prediction.types?.includes('route')) {
                return false;
            }

            const streetName = prediction?.terms?.[0]?.value ?? '';
            if (streets.includes(streetName)) {
                return false;
            }

            const checkPlace = removeDiacritics(place);
            let placeFound = false;
            let foundPlaceName;
            for (const term of prediction.terms) {
                const checkTerm = removeDiacritics(term.value);
                const similarity = getAddressComponentSimilarity(checkTerm, checkPlace, brandConfigSettings.addressComponentAliases, 0.75);
                if (similarity > 0.75 || checkTerm.indexOf(checkPlace) > -1 || checkPlace.indexOf(checkTerm) > -1) {
                    placeFound = true;
                    foundPlaceName = term.value;
                }
            }
            let provinceFound = false;

            if (province) {
                const checkProvince = removeDiacritics(province);
                for (const term of prediction.terms) {
                    const checkTerm = removeDiacritics(term.value);
                    const similarity = getAddressComponentSimilarity(
                        checkTerm,
                        checkProvince,
                        brandConfigSettings.addressComponentAliases,
                        0.75,
                    );
                    if (similarity > 0.75 || checkTerm.indexOf(checkProvince) > -1 || checkProvince.indexOf(checkTerm) > -1) {
                        provinceFound = true;
                    }
                }
            }

            if (placeFound) {
                if (!province || provinceFound) {
                    if (streetName.charAt(0).toLowerCase() === keyword.charAt(0).toLowerCase()) {
                        streets.push(streetName);
                        return {
                            placeName: foundPlaceName,
                            id: prediction.id,
                            name: prediction.terms[0].value,
                        };
                    }
                }
            }
            return false;
        })
        .filter((prediction: unknown) => !!prediction);

    return predictions;
};
export class AddressComponentsRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.get('/address-components/provinces', (req, res, next) => {
            return new AddressComponentsRoute().fetchProvinces(req, res, next);
        });

        router.get('/address-components/places', (req, res, next) => {
            return new AddressComponentsRoute().fetchPlaces(req, res, next);
        });

        router.get('/address-components/streets', (req, res, next) => {
            if ((req?.query?.filter as ParsedQs)?.['postal-code']) {
                return new AddressComponentsRoute().fetchStreetsByPostalCode(req, res, next);
            } else {
                return new AddressComponentsRoute().fetchStreets(req, res, next);
            }
        });

        router.get('/address-components', (req, res, next) => {
            if ((req?.query?.filter as ParsedQs)?.latitude) {
                return new AddressComponentsRoute().reverseGeocode(req, res, next);
            } else {
                return new AddressComponentsRoute().geocode(req, res, next);
            }
        });
    }

    async fetchProvinces(req: Request, res: Response, next: NextFunction) {
        req.sanitizeQuery('filter.keyword').trim();

        const models = getModels(req.brandCode);
        let items;
        const keyword = (req.query?.filter as ParsedQs)?.keyword as string;
        if (keyword) {
            items = await models.Province.byKeyword(keyword);
        } else {
            items = await models.Province.all();
        }

        const brandConfigSettings = config.getConfig(req.brandCode);
        const ret = brandConfigSettings.defaultProvinceName
            ? items.map(item => {
                  return {
                      ...item.dataValues,
                      default: item.province_name === brandConfigSettings.defaultProvinceName,
                  };
              })
            : items.map(item => item.dataValues);
        res.json(provinceSerializer.serialize(ret));
    }

    async fetchPlaces(req: Request, res: Response, next: NextFunction) {
        req.sanitizeQuery('filter.keyword').trim();
        req.checkQuery('filter.keyword').notEmpty().withMessage({
            code: 'REQUIRED',
            title: 'filter.keyword is required',
        });

        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }

        const getFromMapBox = async (keyword: string, brandCode: BrandCode, localeCode: string, province?: string) => {
            const accessToken = Environment.apiKeys.mapbox_access_token;
            const countryCode = brandCodeToCountryCode(brandCode);
            const fullUrl = buildMapBoxUrl(accessToken, 'place', province, undefined, keyword, countryCode, localeCode);

            try {
                const res = await request({ url: fullUrl, json: true });
                const names: string[] = [];
                const duplicates: string[] = [];
                const features = res.body.features as MapboxFeature[] | undefined;
                return (
                    features
                        ?.filter(feature => feature.relevance > 0.6)
                        .map(feature => {
                            if (names.includes(feature.text)) {
                                duplicates.push(feature.text);
                            } else {
                                names.push(feature.text);
                            }
                            return {
                                id: feature.id,
                                name: feature.text,
                                longitude: feature.center?.[0],
                                latitude: feature.center?.[1],
                            };
                        })
                        .filter(item => !duplicates.includes(item.name)) ?? []
                );
            } catch (error) {
                console.warn(`(${fullUrl}) Can't JSON.parse`, error);
                this.serverError(req, res, error as Error);
            }
        };

        const getFromDb = async (keyword: string, countryCode: BrandCode, localeId: number) => {
            const suggestions = await getModels(countryCode).Place.byKeyword(keyword, {
                limit: 5,
                localeId,
            });

            return suggestions.map(suggestion => {
                return {
                    id: suggestion.instance_id,
                    name: suggestion.place_name,
                    latitude: suggestion.map_latitude,
                    longitude: suggestion.map_longitude,
                };
            });
        };

        const filter = req.query.filter as ParsedQs;
        const keyword = filter.keyword as string;

        const cache = await CacheService.getInstance(
            CacheItem.addressComponents({
                key: 'places',
                brandCode: req.brandCode,
                locale: req.locale,
                keyword: keyword.replace(/\s/g, '-'),
            }),
        );
        let placeResult = await cache.get<object>();
        if (!placeResult) {
            const res = await Promise.all([
                getFromMapBox(keyword, req.brandCode, req.locale, filter.province as string),
                getFromDb(keyword, req.brandCode, req.localeId),
            ]);
            const placeResultMapbox = res[0] ?? [];
            const placeResultDB = res[1];

            const mapBoxPlaceNames = placeResultMapbox.map(el => el.name);
            placeResultDB.forEach(element => {
                if (!mapBoxPlaceNames.includes(element.name)) {
                    placeResultMapbox.push(element as never);
                }
            });
            placeResult = placeResultMapbox;
            cache.set(placeResult);
        }
        res.json(mapBoxPlaceSerializer.serialize(placeResult));
    }

    async fetchStreets(req: Request, res: Response, next: NextFunction) {
        req.sanitizeQuery('filter.keyword').trim();
        req.checkQuery('filter.keyword').notEmpty().withMessage({
            code: 'REQUIRED',
            title: 'filter.keyword is required',
        });

        req.checkQuery('filter.place').notEmpty().withMessage({
            code: 'REQUIRED',
            title: 'filter.place is required',
        });

        req.checkQuery('filter.place-longitude').optional().isNumeric().withMessage({
            code: 'INVALID_VALUE',
            title: 'place longitude must be a number',
        });

        req.checkQuery('filter.place-latitude').optional().isNumeric().withMessage({
            code: 'INVALID_VALUE',
            title: 'place latitude must be a number',
        });

        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }

        let streets: unknown[];
        const brandConfigSettings = config.getConfig(req.brandCode);
        const countryCode = brandCodeToCountryCode(req.brandCode);
        const filter = req.query.filter as ParsedQs;
        if (brandConfigSettings.streetCompletionProvider === 'google') {
            const googleResponse = await getStreetsFromGoogle(
                filter.place as string,
                filter.keyword as string,
                countryCode,
                req.locale,
                (req.query.filter as ParsedQs).province as string,
            );

            try {
                streets = parseGoogleStreetsResponse(
                    req.brandCode,
                    googleResponse,
                    filter.keyword as string,
                    filter.place as string,
                    filter.province as string,
                );
            } catch (e) {
                console.warn(`Can't JSON.parse ${googleResponse}`);
                this.serverError(req, res, e as Error);
                return void 0;
            }
            res.json(streetSerializer.serialize(streets));
        } else {
            let proximity;
            const filter = req.query.filter as ParsedQs;
            if (filter['place-longitude'] && filter['place-latitude']) {
                proximity = `${filter['place-longitude'] as string},${filter['place-latitude'] as string}`;
            } else {
                const placeUrl = StringUtil.safeString(filter.place as string);
                const place = await getModels(req.brandCode).Place.byPlaceUrl(placeUrl, false, req.localeId);
                if (place) {
                    proximity = `${place.map_longitude},${place.map_latitude}`;
                }
            }
            const fullUrl = buildMapBoxUrl(
                Environment.apiKeys.mapbox_access_token,
                'address',
                filter.province as string,
                filter.place as string,
                filter.keyword as string,
                countryCode,
                req.locale,
                proximity,
            );
            const mapBoxResponse = await new Promise(resolve => {
                request_.get(fullUrl, (error, response, body) => {
                    console.log('error', error);
                    resolve(body);
                });
            });
            try {
                streets = parseMapBoxStreetsResponse(mapBoxResponse, filter.place as string, brandConfigSettings.addressComponentAliases);
            } catch {
                streets = [];
            }
            res.json(mapBoxStreetSerializer.serialize(streets));
        }
    }

    async fetchStreetsByPostalCode(req: Request, res: Response, next: NextFunction) {
        req.sanitizeQuery('filter.postal-code').trim();
        req.checkQuery('filter.postal-code').notEmpty().withMessage({
            code: 'REQUIRED',
            title: 'filter.postal-code is required',
        });

        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }

        const returnMultiplePostcodes = req.brandCode.toLowerCase() === 'my';

        const models = getModels(req.brandCode);

        const filter = req.query.filter as ParsedQs;
        const postalCodeStr = (filter['postal-code'] as string).replace(/[^a-zA-Z0-9]+/g, '');
        if (returnMultiplePostcodes) {
            const postalCodes = await models.PostalCode.byPostalCodes(postalCodeStr);
            res.json(
                streetSerializer.serialize(
                    postalCodes.map(postalCode => {
                        return {
                            id: filter['postal-code'],
                            name: postalCode.street_name,
                            placeName: postalCode.place_name,
                            province: postalCode.province_name,
                        };
                    }),
                ),
            );
        } else {
            let postalCode = await models.PostalCode.byPostalCode(postalCodeStr);
            if (!postalCode) {
                postalCode = await models.PostalCode.byPostalCodeRange(parseInt(postalCodeStr, 10));

                if (!postalCode) {
                    return notFoundError({ res, title: 'Postal code not found' });
                }
            }

            const result = {
                id: filter['postal-code'],
                name: postalCode.street_name,
                placeName: postalCode.place_name,
            };
            res.json(streetSerializer.serialize(result));
        }
    }

    async reverseGeocode(req: Request, res: Response, next: NextFunction) {
        req.checkQuery('filter.latitude')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'filter.latitude is required',
            })
            .isDecimal()
            .withMessage({
                code: 'INVALID_FORMAT',
                title: 'filter.latitude must be a number',
            });

        req.checkQuery('filter.longitude')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'filter.longitude is required',
            })
            .isDecimal()
            .withMessage({
                code: 'INVALID_FORMAT',
                title: 'filter.longitude must be a number',
            });

        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }

        const geo = new GeocodeService(brandCodeToCountryCode(req.brandCode));
        const address = await geo.reverse(
            Number((req.query.filter as ParsedQs).latitude),
            Number((req.query.filter as ParsedQs).longitude),
            req.locale,
        );

        if (!address?.found) {
            notFoundError({ res, title: 'Address not found' });
        } else {
            res.json(fullAddressSerializer.serialize(address));
        }
    }

    async geocode(req: Request, res: Response, next: NextFunction) {
        const brandConfigSettings = config.getConfig(req.brandCode);
        if (!brandConfigSettings.usePostalCodes) {
            req.checkQuery('filter.placeName').notEmpty().withMessage({
                code: 'REQUIRED',
                title: 'Place is required',
            });

            req.checkQuery('filter.streetName').notEmpty().withMessage({
                code: 'REQUIRED',
                title: 'Street name is required',
            });
        } else {
            req.checkQuery('filter.postalCode').notEmpty().withMessage({
                code: 'REQUIRED',
                title: 'Postal code is required',
            });
        }

        req.checkQuery('filter.houseNumber')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'House number is required',
            })
            .matches(/[0-9]+/)
            .withMessage({
                code: 'INVALID_FORMAT',
                title: 'Housenumber must contain a number',
            });

        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }

        const locale = brandConfigSettings.placeNameLocales.includes(req.locale) ? req.locale : brandConfigSettings.placeNameLocales[0];
        const geoService = new GeocodeService(brandCodeToCountryCode(req.brandCode));

        if (!brandConfigSettings.usePostalCodes) {
            const address = await geoService.geocodeAddress(
                (req.query.filter as ParsedQs).placeName as string,
                (req.query.filter as ParsedQs).streetName as string,
                (req.query.filter as ParsedQs).houseNumber as string,
                undefined,
                locale,
            );
            res.json(fullAddressSerializer.serialize(address));
        } else {
            const address = await geoService.geocodePostalCode(
                (req.query.filter as ParsedQs).postalCode as string,
                (req.query.filter as ParsedQs).houseNumber as string,
                locale,
            );
            res.json(fullAddressSerializer.serialize(address));
        }
    }
}
