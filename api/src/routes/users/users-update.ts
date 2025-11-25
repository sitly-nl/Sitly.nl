import { SitlyRouter } from './../sitly-router';
import { Request, Response } from 'express';
import { Error as JSONAPIError } from 'jsonapi-serializer';
import { UsersRoute } from './users';
import { TextAnalyzerService } from '../../services/text-analyzer.service';
import { serializeUser } from './user.serializer';
import { config } from '../../../config/config';
import { GeocodeService } from '../../services/geocode/geocode.service';
import { LogService, CustomLogType } from '../../services/log.service';
import { optionalAwait, Util } from '../../utils/util';
import { brandCodeToCountryCode } from '../../models/brand-code';
import { UserWarningService } from '../../services/user-warning.service';
import { FacebookService } from '../../services/facebook.service';
import { StringUtil } from '../../utils/string-util';
import { GeoData, UserAsyncCustomSetters, UserCustomSetters } from './user-custom-setters';
import { UserUpdatableProperties } from '../user-updatable-properties';
import { CountrySettingsRoute } from '../country-settings';
import { BaseRoute, ErrorObject } from '../route';
import { UnprocessableEntityError, notFoundError } from '../../services/errors';
import { PhotoService } from '../../services/photo.service';
import { sanitizeUserUpdate } from './user-update-sanitization';
import { TrackingService } from '../../services/tracking.service';
import { CustomUser, DiscountType } from '../../models/user/custom-user.model';
import { OptionalUserRequest, UserRequest } from '../../services/auth.service';
import { UserWarningType } from '../../models/user-warning.model';
import { TranslationsService } from '../../services/translations.service';
import { parseISO } from 'date-fns';
import { getModels } from '../../sequelize-connections';
import { User } from '../../models/user/user.model';
import { Op } from 'sequelize';
import { CryptoUtil } from '../../utils/crypto-util';
import * as locale from 'locale';

export class UsersUpdateRoute extends UsersRoute {
    static create(router: SitlyRouter) {
        router.patch<UserRequest>('/users/me', (req, res) => {
            return new UsersUpdateRoute().update(req, res);
        });

        router.post<OptionalUserRequest>('/users/:userUrl/custom-log', (req, res) => {
            return new UsersUpdateRoute().customLog(req, res);
        });

        router.post<UserRequest>('/users/me/discount', (req, res) => {
            return new UsersUpdateRoute().enableDiscount(req, res);
        });

        router.post('/users/:userUrl/location', (req, res) => {
            return new UsersUpdateRoute().updateAddress(req, res);
        });
    }

    async customLog(req: OptionalUserRequest, res: Response) {
        const customLogTypes = Object.values(CustomLogType);

        req.checkBody('type')
            .isIn(customLogTypes)
            .withMessage({
                code: 'INVALID_VALUE',
                title: `Invalid log-type, must be one of ${customLogTypes}`,
            });

        if (req.body.type === CustomLogType.registrationQuestion) {
            req.checkBody('currentQuestion').notEmpty().withMessage({
                code: 'REQUIRED',
                title: 'currentQuestion is required',
            });
            req.checkBody('nextQuestion').notEmpty().withMessage({
                code: 'REQUIRED',
                title: 'nextQuestion is required',
            });
        }

        if (req.body.type === CustomLogType.userUpdate) {
            req.checkBody('field').notEmpty().withMessage({
                code: 'REQUIRED',
                title: 'field is required',
            });
            req.checkBody('value').notEmpty().withMessage({
                code: 'REQUIRED',
                title: 'value is required',
            });
        }

        if (req.body.type === CustomLogType.clientError) {
            req.checkBody('stack').notEmpty().withMessage({
                code: 'REQUIRED',
                title: 'stack is required',
            });
            req.checkBody('info').notEmpty().withMessage({
                code: 'REQUIRED',
                title: 'info is required',
            });
        }
        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }

        if (req.body.type === CustomLogType.registrationQuestion) {
            await optionalAwait(
                LogService.logRequest({
                    req,
                    label: `user.update.${req.body.currentQuestion}`,
                    message: '',
                    details: {
                        'current-question': req.body.currentQuestion as string,
                        'next-question': req.body.nextQuestion as string,
                    },
                }),
            );
        }

        if (req.body.type === CustomLogType.clientError) {
            await optionalAwait(
                LogService.logRequest({
                    req,
                    label: 'user.clientError',
                    message: req.body.info as string,
                    details: {
                        stack: req.body.stack,
                    },
                }),
            );
        }

        if (req.cmsAuthenticated) {
            const user = await getModels(req.brandCode).User.byUserUrl(req.params.userUrl, {
                includeIncomplete: true,
                includeDeleted: true,
                includeDisabled: true,
                includeInappropriate: true,
            });
            if (!user) {
                return notFoundError({ res, title: 'User not found' });
            }
            if (req.body.type === CustomLogType.userUpdate) {
                await optionalAwait(
                    LogService.logRequest({ req, label: `user.update.${req.body.field}`, message: req.body.value as string, user }),
                );
            }
        }

        res.status(204);
        res.json();
    }

    async update(req: UserRequest, res: Response) {
        let includes;
        try {
            includes = this.getIncludes(req, this.userPrivateAllowedIncludes);
        } catch (e) {
            return this.handleError(req, res, e);
        }

        const models = getModels(req.brandCode);
        const serviceProperties = ['validateAvatar'];
        const updatableProperties = UserUpdatableProperties.getUserUpdatableProperties(req);
        const allowedProperties = updatableProperties.concat(serviceProperties);

        const checkEmail = req.user.email;
        if (req.body.testPremium && checkEmail && Util.isTestingEmail(checkEmail)) {
            const webuserUrl = req.user.customUser.webuser_url;
            const decrypted = CryptoUtil.decryptIv(req.body.testPremium as string, 'testUserPremium');
            if (decrypted === `${checkEmail}-${webuserUrl}`) {
                allowedProperties.push('testPremium');
            }
        }
        const forbiddenProperties = Object.keys(req.body as object).filter(item => {
            return allowedProperties.indexOf(item) < 0;
        });

        let errors: ErrorObject[] = [];

        if (forbiddenProperties.length > 0) {
            errors = forbiddenProperties.map(prop => {
                return {
                    code: 'INVALID_FIELD',
                    source: { parameter: encodeURIComponent(prop) },
                };
            });
        }

        sanitizeUserUpdate(req, req.user);

        const validationResult = await req.getValidationResult();
        if (!validationResult.isEmpty()) {
            errors = [...errors, ...validationResult.array().map(BaseRoute.errorMapper)];
        }

        if (req.body.email && !errors.some(error => error.source.parameter === 'email')) {
            const emailExists = await models.User.emailExists(req.body.email as string);
            if (emailExists) {
                errors.push({
                    code: 'DUPLICATE_EMAIL',
                    title: 'This e-mail already exists',
                    source: { parameter: 'email' },
                });
            }
        }

        if (req.body.activeCouponCode) {
            const couponsCount = await models.Coupon.count({
                where: {
                    coupon_code: req.body.activeCouponCode as string,
                    active: 1,
                    start_date: {
                        [Op.lte]: new Date(),
                    },
                    [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: new Date() } }],
                },
                include: [
                    {
                        association: 'subscription',
                        where: {
                            active: 1,
                            webrole_id: req.user.webrole_id,
                        },
                    },
                ],
            });
            if (couponsCount === 0) {
                errors.push({
                    code: 'INVALID_VALUE',
                    title: 'This coupon doesn`t exist',
                    source: { parameter: 'activeCouponCode' },
                });
            }
        }

        if (errors.length > 0) {
            return res.status(422).json(JSONAPIError(errors));
        }

        if (req.query.validate) {
            return res.json(JSONAPIError([]));
        }

        await req.user.customUser.reload({ include: ['fosterProperties', 'parentSearchPreferences'] });

        try {
            const updateRes = await this.updateUserModel(JSON.parse(JSON.stringify(req.body)) as never, req.user, req);

            await req.user.reload({
                include: {
                    association: 'customUser',
                    include: CustomUser.includes([
                        ...includes,
                        ...(['locale', 'place', 'fosterProperties', 'parentSearchPreferences'] as const).filter(
                            item => !includes.includes(item),
                        ),
                    ]),
                },
            });

            res.json(
                await serializeUser({
                    data: req.user,
                    contextUser: req.user,
                    localeCode: req.locale,
                    includes,
                    metaInfo: updateRes.geocodeProvider ? { meta: { geocodeProvider: updateRes.geocodeProvider }, links: {} } : undefined,
                }),
            );
        } catch (e) {
            this.handleError(req, res, e);
        }
    }

    async enableDiscount(req: UserRequest, res: Response) {
        req.checkBody('reason')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'reason is required',
            })
            .isIn(Object.values(DiscountType))
            .withMessage({
                code: 'INVALID_VALUE',
                title: `reason must be one of ${Object.values(DiscountType)}`,
            });

        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }

        await req.user.customUser.update({
            discount_percentage: CountrySettingsRoute.winbackDiscountPercentage,
            discount_type: req.body.reason as never,
        });

        let includes;
        try {
            includes = this.getIncludes(req, this.userPrivateAllowedIncludes);
        } catch (e) {
            return this.handleError(req, res, e);
        }
        await req.user.customUser.reload({ include: includes });

        const response = await serializeUser({
            data: req.user,
            contextUser: req.user,
            localeCode: req.locale,
            includes,
        });
        res.status(201).json(response);
    }

    async updateAddress(req: Request, res: Response) {
        req.checkBody('latitude')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'latitude is required',
            })
            .isDecimal()
            .withMessage({
                code: 'INVALID_FORMAT',
                title: 'latitude must be a number',
            });

        req.checkBody('longitude')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'longitude is required',
            })
            .isDecimal()
            .withMessage({
                code: 'INVALID_FORMAT',
                title: 'longitude must be a number',
            });

        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }

        const models = getModels(req.brandCode);
        const user = await models.User.byUserUrl(req.params.userUrl);

        const geo = new GeocodeService(brandCodeToCountryCode(req.brandCode));
        const address = await geo.reverse(req.body.latitude as number, req.body.longitude as number, req.locale);

        if (address?.placeName && address.streetName) {
            const placeUrl = StringUtil.safeString(address.placeName ?? '');
            const place = await models.Place.byPlaceUrl(placeUrl, false, req.localeId);
            if (place && user) {
                const placeId = place.instance_id;
                await user.customUser.update({
                    address: address.streetName,
                    place_id: placeId,
                });
            } else {
                console.log(placeUrl);
            }

            res.status(204);
            res.json();
        } else {
            res.status(404);
            res.json(
                JSONAPIError({
                    code: 'NOT_FOUND',
                    title: 'Address not found',
                }),
            );
            return void 0;
        }
    }

    // TODO: ideally req should be removed from params
    private async updateUserModel(saveData: Record<string, string>, user: User, req: Request) {
        const brandCode = user.brandCode;

        ['birthdate', 'availableFromDate', 'discountOfferedDate', 'gracePeriod', 'premium'].forEach(key => {
            if (saveData[key]) {
                saveData[key] = parseISO(saveData[key]) as never;
            }
        });

        const brandConfigSettings = config.getConfig(brandCode);
        let geocodeProvider;

        if (saveData.placeName) {
            const geoData = {
                place: saveData.placeName,
                postalCode: saveData.postalCode,
                streetName: saveData.streetName,
                houseNumber: saveData.houseNumber,
                country: brandCodeToCountryCode(brandCode),
                locales: brandConfigSettings.placeNameLocales,
                latitude: undefined,
                longitude: undefined,
            };
            let geo = undefined;

            if (saveData.latitude && saveData.longitude) {
                geoData.latitude = saveData.latitude as never;
                geoData.longitude = saveData.longitude as never;

                delete saveData.latitude;
                delete saveData.longitude;
            } else {
                const geoService = new GeocodeService(geoData.country);

                const locale = brandConfigSettings.placeNameLocales.includes(req.locale)
                    ? req.locale
                    : brandConfigSettings.placeNameLocales[0];
                geo = await geoService.geocodeAddress(geoData.place, geoData.streetName, geoData.houseNumber, geoData.postalCode, locale);
                geocodeProvider = geo.geocodeProvider;

                LogService.logRequest({
                    req,
                    user,
                    label: 'user.update.address',
                    message: `Input:\nplace=${saveData.placeName},street=${saveData.streetName},house=${
                        saveData.houseNumber
                    }\nOutput:\nplace=${geo.placeName},street=${geo.streetName},house=${geo.houseNumber},bounds=${
                        geo.placeBounds ? JSON.stringify(geo.placeBounds) : '-'
                    }`,
                });

                if (!geo?.placeName) {
                    throw new UnprocessableEntityError({ title: 'Invalid address', source: { parameter: 'address' } });
                } else if ((!geo.streetName || !geo.found) && geo.placeBounds) {
                    throw new UnprocessableEntityError({ title: 'Invalid street or house number', source: { parameter: 'address' } });
                } else if (!geo.found) {
                    throw new UnprocessableEntityError({ title: 'Invalid address', source: { parameter: 'address' } });
                }
            }

            delete saveData.placeName;
            delete saveData.streetName;
            delete saveData.houseNumber;
            await UserAsyncCustomSetters.address(user, geoData, geo, req.localeId);
        } else if (saveData.postalCode) {
            const geoData: GeoData = {
                postalCode: saveData.postalCode as never,
                houseNumber: saveData.houseNumber as never,
                country: brandCodeToCountryCode(brandCode),
                locales: brandConfigSettings.placeNameLocales,
            };
            const geoService = new GeocodeService(geoData.country);
            const locale = brandConfigSettings.placeNameLocales.includes(req.locale) ? req.locale : brandConfigSettings.placeNameLocales[0];
            const geo = await geoService.geocodePostalCode(geoData.postalCode, geoData.houseNumber, locale);
            LogService.logRequest({
                req,
                user,
                label: 'user.update.address',
                message: `Input:\npostalCode=${saveData.postalCode},house=${saveData.houseNumber}\nOutput:\nplace=${geo.placeName},street=${
                    geo.postalCode
                },house=${geo.houseNumber},bounds=${geo.placeBounds ? JSON.stringify(geo.placeBounds) : '-'}`,
            });

            if (!geo.placeName) {
                throw new UnprocessableEntityError({ title: 'Invalid address', source: { parameter: 'address' } });
            } else if ((!geo.postalCode || !geo.houseNumber) && geo.placeBounds) {
                throw new UnprocessableEntityError({ title: 'Invalid postal code or house number', source: { parameter: 'postalCode' } });
            }

            delete saveData.postalCode;
            delete saveData.houseNumber;
            await UserAsyncCustomSetters.address(user, geoData, geo, req.localeId);
        }

        if (saveData.avatar) {
            await PhotoService.processAvatar({
                base64Value: saveData.avatar,
                validateAvatar: !!saveData.validateAvatar,
                user,
            });
            delete saveData.avatar;
        }

        if (saveData.isAvailableOccasionally || saveData.isAvailableRegularly) {
            user.customUser.set('availability_updated', new Date());
        }

        if (req.body.localeCode) {
            const supportedLocales = await getModels(brandCode).Locale.supportedLocales();
            const locales = new locale.Locales(Object.keys(supportedLocales));
            const result = new locale.Locales(req.body.localeCode as never).best(locales).toString();
            const localeId = result ? supportedLocales[result] : undefined;
            if (localeId) {
                saveData.localeId = localeId as never;
                delete saveData.localeCode;
            } else {
                throw new UnprocessableEntityError({ title: 'Invalid locale code', source: { parameter: 'localeCode' } });
            }
        }

        const logs: { label: string; message?: string; details?: Record<string, unknown> }[] = [];
        const userAttrs = Object.keys(user.dataValues);
        const customUserAttrs = Object.keys(user.customUser.dataValues);
        const customSetters = new UserCustomSetters();
        Object.keys(saveData).forEach(field => {
            let updatedField = true;
            if (customSetters[field as keyof UserCustomSetters]) {
                customSetters[field as keyof UserCustomSetters](user, saveData[field] as never);
            } else if (userAttrs.indexOf(StringUtil.snakeCase(field)) >= 0) {
                user.set(StringUtil.snakeCase(field) as never, saveData[field] as never);
            } else if (customUserAttrs.indexOf(StringUtil.snakeCase(field)) >= 0) {
                user.customUser.set(StringUtil.snakeCase(field) as never, saveData[field] as never);
            } else {
                updatedField = false;
            }

            if (updatedField) {
                if (field === 'completed') {
                    logs.push({
                        label: 'user.complete',
                        message: user.roleName,
                        details: {
                            'next-question': 'completed',
                        },
                    });
                    const fbService = new FacebookService();
                    fbService.trackRegistration(req, user);
                } else {
                    logs.push({
                        label: `user.update.${field}`,
                        message: typeof saveData[field] === 'string' ? saveData[field] : JSON.stringify(saveData[field]),
                    });
                }
            }
        });
        await optionalAwait(
            Promise.all(
                logs.map(log =>
                    LogService.logRequest({ req, user, label: log.label, message: log.message, details: log.details, refresh: true }),
                ),
            ),
        );

        const { about, firstName, lastName, email } = saveData;
        await Promise.all([
            about ? UserWarningService.processUserAttribute(user, UserWarningType.about) : Promise.resolve(),
            firstName ? UserWarningService.processUserAttribute(user, UserWarningType.firstName) : Promise.resolve(),
            lastName ? UserWarningService.processUserAttribute(user, UserWarningType.lastName) : Promise.resolve(),
            email ? UserWarningService.processUserAttribute(user, UserWarningType.email) : Promise.resolve(),
        ]);

        const writtenNumbers = await TranslationsService.singleTranslation({
            localeId: req.localeId,
            groupName: 'api',
            code: 'writtenNumbers',
        });
        const hasPersonalData = TextAnalyzerService.hasPersonalData(user.customUser?.about ?? '', writtenNumbers.split(','));
        if (hasPersonalData) {
            user.customUser.abuse = 1;
        }

        if (saveData.subscription_cancelled) {
            await optionalAwait(TrackingService.trackUserPremiumStatusChange(user, null, true));
        }

        await user.save();
        await user.customUser.save();
        if (user.customUser.fosterProperties) {
            await user.customUser.fosterProperties.save();
        }
        if (user.customUser.parentSearchPreferences) {
            await user.customUser.parentSearchPreferences.save();
        }

        return { geocodeProvider };
    }
}
