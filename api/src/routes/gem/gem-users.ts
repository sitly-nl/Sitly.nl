import { SitlyRouter } from '../sitly-router';
import { Request, Response } from 'express';
import { serializeGemUser } from '../../models/serialize/gem-user-response';
import { sanitizeGemUserCreate, sanitizeGemUserUpdate } from './gem-user-sanitization';
import { Error as JSONAPIError, Serializer as JSONAPISerializer } from 'jsonapi-serializer';
import { optionalAwait } from '../../utils/util';
import { BaseRoute } from '../route';
import { authenticator } from 'otplib';
import { BrandCode } from '../../models/brand-code';
import { MysqlError } from 'mysql';
import { duplicateEmailError, forbiddenError, notFoundError, unprocessableEntityError } from '../../services/errors';
import { getMainModels } from '../../sequelize-connections';
import { GemUser, GemUserColumns, GemUserRole } from '../../models/gem/gem-user.model';
import { Locale } from '../../models/locale.model';
import { StringUtil } from '../../utils/string-util';

const tfaSecretSerializer = new JSONAPISerializer('tfaSecret', {
    attributes: ['secret'],
    keyForAttribute: 'camelCase',
});

export class GemUsersRoute extends BaseRoute {
    private updatableProperties = ['email', 'first_name', 'last_name', 'password', 'role', 'countries', 'locales'];

    private customSetters: Record<string, (userModel: GemUser, value: string) => GemUser> = {
        password: (userModel: GemUser, password: string) => {
            return userModel.set(GemUser.passwordFields(password));
        },
    };

    static create(router: SitlyRouter) {
        router.get('/gem/gem-users', (req, res) => {
            return new GemUsersRoute().list(req, res);
        });

        router.get('/gem/gem-users/:gemUserId', (req, res) => {
            return new GemUsersRoute().fetch(req, res);
        });

        router.post('/gem/gem-users', (req, res) => {
            return new GemUsersRoute().create(req, res);
        });

        router.delete('/gem/gem-users/:gemUserId', (req, res) => {
            return new GemUsersRoute().delete(req, res);
        });

        router.patch('/gem/gem-users/:gemUserId', (req, res) => {
            return new GemUsersRoute().update(req, res);
        });

        router.post('/gem/gem-users/:gemUserId/2fa-secret', (req, res) => {
            return new GemUsersRoute().reset2FaSecret(req, res);
        });
    }

    async list(req: Request, res: Response) {
        res.status(200);
        const allUsers = await getMainModels().GemUser.findAll({ include: GemUser.defaultIncludes });
        res.json(serializeGemUser(allUsers));
    }

    async fetch(req: Request, res: Response) {
        const gemUserId = this.parsedUserId(req.params.gemUserId);
        const gemUser = gemUserId === 'me' ? req.gemUser : gemUserId && (await getMainModels().GemUser.byId(gemUserId));
        if (!gemUser) {
            return notFoundError({ res, title: 'Gem user not found' });
        }
        if (!gemUser.countries) {
            gemUser.reload({ include: GemUser.defaultIncludes });
        }
        res.status(200);
        res.json(serializeGemUser(gemUser));
    }

    async create(req: Request, res: Response) {
        req = sanitizeGemUserCreate(req);
        if (await this.handleValidationResult(req, res)) {
            return;
        }

        const models = getMainModels();

        const localeIds = req.body.locales as number[] | undefined;
        let locales = [] as Locale[];
        if (localeIds) {
            locales = await models.Locale.findAll({
                where: {
                    locale_id: localeIds,
                    active: 1,
                },
            });
            if (locales.length !== localeIds.length) {
                return unprocessableEntityError({
                    res,
                    title: 'One of the supplied locales does not exist',
                    source: { parameter: 'locales' },
                });
            }
        }

        const countries = await models.Country.byCountryCodes(req.body.countries as BrandCode[]);
        if (countries.length !== req.body.countries.length) {
            return unprocessableEntityError({
                res,
                title: 'One of the supplied countries does not exist',
                source: { parameter: 'countries' },
            });
        }

        const tfaSecret = authenticator.generateSecret();
        const password = (req.body.password as string) ?? StringUtil.randomString(20);
        try {
            const gemUser = await models.GemUser.create({
                ...GemUser.passwordFields(password),
                email: req.body.email as string,
                first_name: req.body.firstName as string,
                last_name: req.body.lastName as string,
                role: req.body.role as GemUserRole,
                tfa_secret: tfaSecret,
                active: 1,
            });

            await models.GemUserCountry.bulkCreate(
                countries.map(country => {
                    return {
                        country_id: country.country_id,
                        user_id: gemUser.user_id,
                    };
                }),
            );

            if (locales.length > 0) {
                await models.GemUserLocale.bulkCreate(
                    locales.map(locale => {
                        return {
                            locale_id: locale.locale_id,
                            user_id: gemUser.user_id,
                        };
                    }),
                );
            }

            await gemUser.reload({ include: GemUser.defaultIncludes });
            res.status(201);
            res.json(serializeGemUser(gemUser, { password, tfaSecret }));
        } catch (error) {
            if ((error as MysqlError).name === 'SequelizeUniqueConstraintError') {
                return duplicateEmailError(res);
            } else {
                this.serverError(req, res, error as Error);
            }
        }
    }

    async delete(req: Request, res: Response) {
        const paramGemUserId = req.params.gemUserId;
        if (`${req.gemUser?.user_id}` === paramGemUserId) {
            return forbiddenError({ res, code: 'NOT_ALLOWED', title: 'You can not remove yourself as Gem user' });
        }
        const gemUser = await getMainModels().GemUser.byId(parseInt(paramGemUserId, 10));
        if (!gemUser) {
            return notFoundError({ res, title: 'Gem User not found' });
        }
        await gemUser.destroy();
        res.status(204);
        res.json();
    }

    async update(req: Request, res: Response) {
        const paramGemUserId = this.parsedUserId(req.params.gemUserId);
        const models = getMainModels();
        const gemUserToUpdate = paramGemUserId === 'me' ? req.gemUser : paramGemUserId && (await models.GemUser.byId(paramGemUserId));
        if (!gemUserToUpdate) {
            return notFoundError({ res, title: 'Gem User not found' });
        }

        const forbiddenProperties = Object.keys(req.body as object).filter(item => {
            return this.updatableProperties.indexOf(StringUtil.snakeCase(item)) < 0;
        });

        let errors: unknown[] = [];

        if (forbiddenProperties.length > 0) {
            errors = forbiddenProperties.map(prop => {
                return {
                    code: 'INVALID_FIELD',
                    source: { parameter: encodeURIComponent(prop) },
                };
            });
        }

        req = sanitizeGemUserUpdate(req);

        const validationResult = await req.getValidationResult();
        if (!validationResult.isEmpty()) {
            errors = [...errors, ...validationResult.array().map(BaseRoute.errorMapper)];
        }

        const userAttrs = Object.keys(gemUserToUpdate.dataValues);
        const updatedUserAttrs = JSON.parse(JSON.stringify(req.body)) as Record<string, unknown>;
        if (updatedUserAttrs.countries && Array.isArray(updatedUserAttrs.countries)) {
            const newCountryCodes = updatedUserAttrs.countries as BrandCode[];

            const existingCountryCodes = gemUserToUpdate.countries.map(country => country.country_code);
            const added = newCountryCodes.filter(code => !existingCountryCodes.includes(code));
            const deleted = existingCountryCodes.filter(code => !newCountryCodes.includes(code));

            if (added.length) {
                const countries = await getMainModels().Country.byCountryCodes(newCountryCodes);
                if (newCountryCodes.length !== countries.length) {
                    errors.push({
                        code: 'INVALID_VALUE',
                        title: 'One of the supplied countries does not exist',
                        source: { parameter: 'countries' },
                    });
                } else {
                    await Promise.all(
                        countries.map(country =>
                            models.GemUserCountry.create({
                                country_id: country.country_id,
                                user_id: gemUserToUpdate.user_id,
                            }),
                        ),
                    );
                }
            }

            if (deleted.length) {
                const countryIdsToDelete = gemUserToUpdate.countries
                    .filter(model => deleted.includes(model.country_code))
                    .map(model => model.country_id);

                await gemUserToUpdate.unlinkCountries(countryIdsToDelete);
            }

            if (added.length || deleted.length) {
                await gemUserToUpdate.reload({
                    include: 'countries',
                });
            }

            delete updatedUserAttrs.countries;
        }

        const localeIds = req.body.locales as number[] | undefined;
        if (localeIds && Array.isArray(localeIds)) {
            delete updatedUserAttrs.locales;
            const locales = await models.Locale.findAll({
                where: {
                    locale_id: localeIds,
                    active: 1,
                },
            });
            if (locales.length !== localeIds.length) {
                errors.push({
                    code: 'INVALID_VALUE',
                    title: 'One of the supplied locales does not exist',
                    source: { parameter: 'locales' },
                });
            } else {
                const existingLocaleIds = gemUserToUpdate.locales?.map(item => item.locale_id) ?? [];

                const added = localeIds.filter(item => !existingLocaleIds.includes(item));
                if (added.length) {
                    await models.GemUserLocale.bulkCreate(
                        added.map(item => {
                            return {
                                user_id: gemUserToUpdate.user_id,
                                locale_id: item,
                            };
                        }),
                    );
                }

                const deleted = existingLocaleIds.filter(item => !localeIds.includes(item));
                if (deleted.length) {
                    await models.GemUserLocale.destroy({
                        where: {
                            user_id: gemUserToUpdate.user_id,
                            locale_id: deleted,
                        },
                    });
                }
                await gemUserToUpdate.reload({ include: 'locales' });
            }
        }

        if (errors.length) {
            res.status(422);
            res.json(JSONAPIError(errors));
            return void 0;
        }

        Object.keys(updatedUserAttrs).forEach(field => {
            if (this.customSetters[field]) {
                this.customSetters[field](gemUserToUpdate, updatedUserAttrs[field] as string);
            } else if (userAttrs.indexOf(StringUtil.snakeCase(field)) >= 0) {
                gemUserToUpdate.set(StringUtil.snakeCase(field) as keyof GemUserColumns, updatedUserAttrs[field] as never);
            }
        });

        try {
            await gemUserToUpdate.save();
            res.json(serializeGemUser(gemUserToUpdate));
        } catch (error) {
            if ((error as MysqlError).name === 'SequelizeUniqueConstraintError') {
                return duplicateEmailError(res);
            } else {
                this.serverError(req, res, error as Error);
            }
        }
    }

    async reset2FaSecret(req: Request, res: Response) {
        const paramGemUserId = this.parsedUserId(req.params.gemUserId);
        const gemUserToUpdate =
            paramGemUserId === 'me' ? req.gemUser : paramGemUserId && (await getMainModels().GemUser.byId(paramGemUserId));
        if (!gemUserToUpdate) {
            return notFoundError({ res, title: 'Gem user not found' });
        }

        await optionalAwait(
            gemUserToUpdate.update({
                tfa_secret: authenticator.generateSecret(),
            }),
        );
        res.status(201);

        res.json(
            tfaSecretSerializer.serialize({
                id: '2fa-secret',
                secret: gemUserToUpdate.tfa_secret,
            }),
        );
    }

    private parsedUserId(value: string) {
        if (value === 'me') {
            return value;
        }
        const number = parseInt(value, 10);
        return Number.isNaN(number) ? undefined : number;
    }
}
