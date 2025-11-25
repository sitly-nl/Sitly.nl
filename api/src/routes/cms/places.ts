import { SitlyRouter } from '../sitly-router';
import { Request, Response } from 'express';
import { BaseRoute } from './../route';
import { Serializer as JSONAPISerializer, Error as JSONAPIError } from 'jsonapi-serializer';
import { createClient } from '@google/maps';
import { config } from '../../../config/config';
import { StringUtil } from '../../utils/string-util';
import { ParsedQs } from 'qs';
import { Environment } from '../../services/env-settings.service';
import { validatePage } from '../common-validators';
import { BrandCode } from '../../models/brand-code';
import { Place, PlaceColumns } from '../../models/place.model';
import { getModels } from '../../sequelize-connections';
import { LocaleId } from '../../models/locale.model';
import { notFoundError } from '../../services/errors';

interface PlaceJSON extends PlaceColumns {
    main?: PlaceJSON;
    nearby?: PlaceJSON[];
    alternates?: PlaceJSON[];
    alternatePlaceUrls?: Record<string, unknown>;
    url?: string;
}

const placeToJSON = (place: Place): PlaceJSON => {
    return {
        ...place.dataValues,
        main: place.main ? placeToJSON(place.main) : undefined,
        alternates: place.alternates ? place.alternates.map(item => placeToJSON(item)) : undefined,
    } as PlaceJSON;
};

const serializer = new JSONAPISerializer('places', {
    attributes: [
        'name',
        'url',
        'latitude',
        'longitude',
        'babysit_count',
        'babysit_jobs_count',
        'childminder_count',
        'childminder_jobs_count',
        'user_count',
        'featured',
        'nearby',
    ],
    keyForAttribute: 'camelCase',
    typeForAttribute: (_str, _attrVal) => {
        return 'places';
    },
    transform(place: PlaceJSON) {
        const ret: Record<string, unknown> = {
            ...place,
            id: place.place_url,
            name: place.place_name,
            url: place.place_url,
            latitude: place.map_latitude,
            longitude: place.map_longitude,
            featured: !!place.featured,
            user_count: place.webuser_count,
        };
        if (place.nearby) {
            ret.nearby = place.nearby.map(item => this.transform?.({ ...item }) as unknown);
        }
        return ret;
    },
    dataMeta: {
        alternatePlaceUrls: (place: PlaceJSON) => {
            return place.alternatePlaceUrls;
        },
    },
    nearby: {
        ref: 'id',
        attributes: [
            'name',
            'url',
            'latitude',
            'longitude',
            'babysit_count',
            'babysit_jobs_count',
            'childminder_count',
            'childminder_jobs_count',
            'user_count',
        ],
        dataMeta: {
            alternatePlaceUrls: (mainPlace: unknown, includedPlace: PlaceJSON) => {
                return includedPlace.alternatePlaceUrls;
            },
        },
    },
});

interface AddressComponent {
    types: Array<string>;
    long_name: string;
    short_name: string;
}

export class CmsPlacesRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.get('/cms/places/:placeUrl', (req, res) => {
            return new CmsPlacesRoute().view(req, res);
        });

        router.get('/cms/places/', (req, res) => {
            return new CmsPlacesRoute().list(req, res);
        });
    }

    private getPlaceNameByPostalCode(postalCode: string, country: string) {
        const googleMapsClient = createClient({
            key: Environment.apiKeys.google_maps,
            Promise,
        });

        return googleMapsClient
            .geocode({
                components: {
                    postal_code: postalCode,
                    country,
                },
                language: country,
            })
            .asPromise()
            .then(result => {
                const placeKeys = ['locality', 'administrative_area_level_2'];
                const components = <Array<AddressComponent>>result?.json?.results?.[0]?.address_components;
                if (components) {
                    for (const placeKey of placeKeys) {
                        for (const component of components) {
                            if (component.types.indexOf(placeKey) >= 0) {
                                return component.short_name;
                            }
                        }
                    }
                }
            });
    }

    async list(req: Request, res: Response) {
        const sortTypes: string[] = ['user-count'];

        validatePage({ req });

        req.checkQuery('filter.postal-code')
            .optional()
            .matches(/[0-9]+/)
            .withMessage({
                code: 'INVALID_VALUE',
                title: 'Postal code must contain numbers',
            });

        req.checkQuery('filter.keyword').optional().notEmpty().withMessage({
            code: 'INVALID_LENGTH',
            title: 'keyword may not be empty',
        });
        req.checkQuery('filter.user-count.min').optional().isInt().withMessage({
            code: 'INVALID_FORMAT',
            title: 'min-user-count must be a number',
        });
        req.checkQuery('filter.user-count.max').optional().isInt().withMessage({
            code: 'INVALID_FORMAT',
            title: 'max-user-count must be a number',
        });
        req.checkQuery('filter.exclude-places')
            .optional()
            .callback((value: unknown) => value instanceof Array)
            .withMessage({
                code: 'INVALID_FORMAT',
                title: 'exclude-places must be an array',
            });

        req.checkQuery('sort')
            .optional()
            .callback((value: string, sortTypes: string) => {
                const sortValues = value.split(',');
                for (const sortValue of sortValues) {
                    if (sortTypes.indexOf(sortValue) === -1) {
                        return false;
                    }
                }
                return true;
            }, sortTypes)
            .withMessage({
                code: 'INVALID_VALUE',
                title: `Sort values must be in ${sortTypes.toString()}`,
            });
        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }

        const brandConfigSettings = config.getConfig(req.brandCode);
        const placeNameLocales = brandConfigSettings.placeNameLocales;
        const included = this.getIncludes(req, ['nearby-places', 'alternate-place-urls']);
        const isAlternatePlaceIncluded = included.includes('alternate-place-urls');
        const queryPage = req.query.page as ParsedQs;
        const searchOptions = {
            localeId: brandConfigSettings.defaultLocaleId,
            mergePlaces: false,
            sortByUserCount: req.query.sort === 'user-count',
            useAlternates: isAlternatePlaceIncluded || placeNameLocales.length > 1,
            placeName: undefined as string | undefined,
            filter: req.query?.filter as ParsedQs | undefined,
            page: queryPage
                ? {
                      pageSize: queryPage.size ? Number(queryPage.size) : 10,
                      page: queryPage.page ? Number(queryPage.page) : 1,
                  }
                : undefined,
        };

        const models = getModels(req.brandCode);

        const countryLocales = await models.Locale.all();

        const localeById = (id: LocaleId | null) =>
            countryLocales.find(locale => {
                if (!id) {
                    id = brandConfigSettings.defaultLocaleId;
                }
                return locale.locale_id === id;
            });

        if (searchOptions.useAlternates) {
            if (req.localeId !== brandConfigSettings.defaultLocaleId) {
                const requestLocale = localeById(req.localeId);
                if (requestLocale && placeNameLocales.includes(requestLocale.locale_code)) {
                    searchOptions.localeId = requestLocale.locale_id;
                    searchOptions.mergePlaces = true;
                }
            }
        }

        let postalCode = searchOptions.filter?.['postal-code'] as string;
        if (searchOptions.filter?.keyword) {
            const placeUrl = StringUtil.safeString(searchOptions.filter.keyword as string);

            const place = await models.Place.byPlaceUrl(placeUrl, true, searchOptions.localeId);
            if (place) {
                const placeJson = placeToJSON(place);

                if (included.includes('nearby-places')) {
                    placeJson.nearby = (
                        await models.Place.byDistance({
                            lat: placeJson.map_latitude as number,
                            lng: placeJson.map_longitude as number,
                            distanceInKm: 20,
                            limit: 6,
                            localeId: searchOptions.localeId,
                            mergePlaces: searchOptions.mergePlaces,
                        })
                    ).map(model => placeToJSON(model));
                }

                const serializedReturn = serializer.serialize([placeJson]);
                return res.json(serializedReturn);
            }
            if (!place && !postalCode) {
                postalCode = searchOptions.filter.keyword as string;
            }
        }

        if (postalCode) {
            const country = req.brandCode === BrandCode.xx ? 'NL' : req.brandCode.toUpperCase();
            const placeName = await this.getPlaceNameByPostalCode(postalCode, country);
            if (!placeName) {
                return notFoundError({ res, title: 'Place not found' });
            }
            searchOptions.placeName = placeName;
        }

        let placeCollection;
        try {
            placeCollection = await models.Place.find(searchOptions);
        } catch (error) {
            return this.serverError(req, res, error as Error);
        }

        if (postalCode && placeCollection.length === 0) {
            return notFoundError({ res, title: 'Place not found' });
        }

        if (placeCollection) {
            const places = placeCollection.map(item => placeToJSON(item));
            for (const place of places) {
                const main = place.main ?? place;

                if (main.alternates) {
                    place.alternatePlaceUrls = {};
                    const localeCode = localeById(main.locale_id)?.locale_code;
                    if (localeCode) {
                        place.alternatePlaceUrls[localeCode] = main.place_url;
                    }

                    for (const alternate of main.alternates) {
                        const localeCode = localeById(alternate.locale_id)?.locale_code;
                        if (localeCode) {
                            place.alternatePlaceUrls[localeCode] = alternate.place_url;
                        }
                    }
                    for (const countryLocale of countryLocales) {
                        const countryLocaleCode = countryLocale.locale_code;
                        if (!place.alternatePlaceUrls[countryLocaleCode]) {
                            if (countryLocaleCode === 'en_GB' && main.english_place_url) {
                                place.alternatePlaceUrls[countryLocaleCode] = main.english_place_url;
                            } else {
                                place.alternatePlaceUrls[countryLocaleCode] = main.place_url;
                            }
                        }
                    }
                }
                if (main.english_place_url && !placeNameLocales.includes('en_GB') && req.localeId === LocaleId.en_GB) {
                    main.place_url = main.english_place_url;
                    main.place_name = main.english_place_name ?? '';
                }

                if (included.includes('nearby-places')) {
                    place.nearby = (
                        await models.Place.byDistance({
                            lat: place.map_latitude ?? 0,
                            lng: place.map_longitude ?? 0,
                            distanceInKm: 20,
                            limit: 6,
                            localeId: searchOptions.localeId,
                            mergePlaces: searchOptions.mergePlaces,
                        })
                    ).map(model => placeToJSON(model));
                }
            }
            const serializedReturn = serializer.serialize(places);
            res.json(serializedReturn);
        }
    }

    async view(req: Request, res: Response) {
        const placeUrl: string = req.params.placeUrl;
        const brandConfigSettings = config.getConfig(req.brandCode);
        let mergePlaces = false;
        const placeNameLocales = brandConfigSettings.placeNameLocales;
        const models = getModels(req.brandCode);

        const countryLocales = await models.Locale.all();

        const localeById = (id: LocaleId | null) =>
            countryLocales.find(locale => {
                if (!id) {
                    id = brandConfigSettings.defaultLocaleId;
                }
                return locale.locale_id === id;
            });
        let localeId = brandConfigSettings.defaultLocaleId;
        const useAlternates = placeNameLocales.length > 1 || req.localeId === LocaleId.en_GB;
        if (useAlternates) {
            if (req.localeId !== brandConfigSettings.defaultLocaleId) {
                const requestLocale = localeById(req.localeId);

                if (requestLocale && (placeNameLocales.includes(requestLocale.locale_code) || req.localeId === LocaleId.en_GB)) {
                    localeId = requestLocale.locale_id;
                    mergePlaces = true;
                } else {
                    localeId = brandConfigSettings.defaultLocaleId;
                }
            }
        }

        let loadIncludes;
        if (useAlternates) {
            if (mergePlaces) {
                loadIncludes = async (place: Place) => {
                    place.main = await place.getMain({ include: [{ association: 'alternates' }] });
                    place.alternates = await place.getAlternates();
                };
            } else {
                loadIncludes = async (place: Place) => {
                    place.alternates = await place.getAlternates();
                };
            }
        }

        let place = await models.Place.byPlaceUrl(placeUrl, true, localeId);
        if (place && loadIncludes) {
            await loadIncludes(place);
        }

        if (!placeNameLocales.includes('en_GB') && req.localeId === LocaleId.en_GB) {
            if (!place) {
                place = await models.Place.byPlaceUrl(placeUrl, true);
                if (place && useAlternates) {
                    await place.reload({ include: 'alternates' });
                }
            }
        }

        if (place) {
            const jsonPlace = placeToJSON(place);
            const main = jsonPlace.main ?? jsonPlace;

            if (main.alternates || main.english_place_url) {
                jsonPlace.alternatePlaceUrls = {};
                const localeCode = localeById(main.locale_id)?.locale_code;
                if (localeCode) {
                    jsonPlace.alternatePlaceUrls[localeCode] = main.place_url;
                }

                if (main.alternates) {
                    for (const alternate of main.alternates) {
                        const localeCode = localeById(alternate.locale_id)?.locale_code;
                        if (localeCode) {
                            jsonPlace.alternatePlaceUrls[localeCode] = alternate.place_url;
                        }
                    }
                }
                for (const countryLocale of countryLocales) {
                    const countryLocaleCode = countryLocale.locale_code;
                    if (!jsonPlace.alternatePlaceUrls[countryLocaleCode]) {
                        if (countryLocaleCode === 'en_GB' && main.english_place_url) {
                            jsonPlace.alternatePlaceUrls[countryLocaleCode] = main.english_place_url;
                        } else {
                            jsonPlace.alternatePlaceUrls[countryLocaleCode] = main.place_url;
                        }
                    }
                }
            }
            if (main.english_place_url && !placeNameLocales.includes('en_GB') && req.localeId === LocaleId.en_GB) {
                main.place_url = main.english_place_url;
                main.place_name = main.english_place_name ?? '';
            }

            if (req.query.include === 'nearby-places') {
                const places = await models.Place.byDistance({
                    lat: place.map_latitude ?? 0,
                    lng: place.map_longitude ?? 0,
                    distanceInKm: 40,
                    limit: 6,
                    options: { exclude: [place.instance_id] },
                    localeId,
                    mergePlaces,
                });
                if (loadIncludes) {
                    const load = loadIncludes;
                    await Promise.all(places.map(item => load(item)));
                }

                jsonPlace.nearby = places.map(model => {
                    const jsonPlace = placeToJSON(model);
                    const main = jsonPlace.main ?? jsonPlace;

                    if (main.alternates) {
                        jsonPlace.alternatePlaceUrls = {};
                        const localeCode = localeById(main.locale_id)?.locale_code;
                        if (localeCode) {
                            jsonPlace.alternatePlaceUrls[localeCode] = main.place_url;
                        }

                        for (const alternate of main.alternates) {
                            const localeCode = localeById(alternate.locale_id)?.locale_code;
                            if (localeCode) {
                                jsonPlace.alternatePlaceUrls[localeCode] = alternate.place_url;
                            }
                        }
                        for (const countryLocale of countryLocales) {
                            const countryLocaleCode = countryLocale.locale_code;
                            if (!jsonPlace.alternatePlaceUrls[countryLocaleCode]) {
                                if (countryLocaleCode === 'en_GB' && main.english_place_url) {
                                    jsonPlace.alternatePlaceUrls[countryLocaleCode] = main.english_place_url;
                                } else {
                                    jsonPlace.alternatePlaceUrls[countryLocaleCode] = main.place_url;
                                }
                            }
                        }
                    }
                    if (main.english_place_url && !placeNameLocales.includes('en_GB') && req.localeId === LocaleId.en_GB) {
                        main.place_url = main.english_place_url;
                        main.place_name = main.english_place_name ?? '';
                    }
                    return main;
                });

                const serializedReturn = serializer.serialize(jsonPlace);
                res.json(serializedReturn);
            } else {
                const serializedReturn = serializer.serialize(jsonPlace);
                res.json(JSON.parse(JSON.stringify(serializedReturn).replace(/nearbies/g, 'places')));
            }
        } else {
            res.status(404);
            const errors = JSONAPIError({
                code: 'NOT_FOUND',
                title: 'Place not found',
            });

            res.json(errors);
        }
    }
}
