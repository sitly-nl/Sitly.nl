import { Request, Response } from 'express';
import { MysqlError } from 'mysql';
import { Sequelize } from 'sequelize';
import { getMainModels, getModels, getTranslationModels } from '../../../sequelize-connections';
import { forbiddenError, notFoundError, unprocessableEntityError } from '../../../services/errors';
import { BaseRoute } from '../../route';
import { SitlyRouter } from '../../sitly-router';
import { validateSourceAndTarget, validateTranslations } from './translation-validation';
import { optionalAwait } from '../../../utils/util';
import { CacheService, CachingKeys } from '../../../services/cache.service';
import { LocaleId } from '../../../models/locale.model';

export enum TranslationEnvironment {
    development = 'development',
    acceptance = 'acceptance',
    production = 'production',
}
export const allTranslationEnvironments = Object.values(TranslationEnvironment);

export class TranslationRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.post('/gem/translations', (req, res) => {
            return new TranslationRoute().createTranslation(req, res);
        });
        router.post('/gem/translations/exceptions/:countryId', (req, res) => {
            return new TranslationRoute().updateTranslationForCountry(req, res);
        });
        router.post('/gem/translations/environments', (req, res) => {
            return new TranslationRoute().copyTranslationValue(req, res);
        });
        router.patch('/gem/translations/:localeId', (req, res) => {
            return new TranslationRoute().updateTranslationsForLocales(req, res);
        });
        router.delete('/gem/translations/:translationCodeId', (req, res) => {
            return new TranslationRoute().deleteTranslation(req, res);
        });
    }

    async createTranslation(req: Request, res: Response) {
        req.checkBody('groupId')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'groupId is required',
            })
            .isInt()
            .withMessage({
                code: 'INVALID_VALUE',
                title: 'groupId should be a number',
            });
        req.checkBody('translationCode')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'translationCode is required',
            })
            .isString()
            .withMessage({
                code: 'INVALID_VALUE',
                title: 'translationCode should be a string',
            });
        validateTranslations(req);
        if (await this.handleValidationResult(req, res)) {
            return;
        }

        const groupId = req.body.groupId as number;
        const translationCode = req.body.translationCode as string;
        const translations = req.body.translations as { localeId: number; content: string }[];

        const models = getTranslationModels();
        if (!(await models.TranslationGroup.findByPk(groupId))) {
            return notFoundError({ res, title: 'Group with such id is not found' });
        }

        const existingLocalesCount = await getMainModels().Locale.count({
            where: {
                locale_id: translations.map(item => item.localeId),
                active: 1,
            },
        });
        if (existingLocalesCount !== translations.length) {
            return notFoundError({ res, title: 'Some of supplied localeIds are not found' });
        }

        try {
            const translationCodeEntity = await models.TranslationCode.create({
                translation_group_id: groupId,
                translation_code: translationCode,
            });
            await Promise.all(
                translations.map(translation =>
                    models.TranslationValue.create({
                        translation_code_id: translationCodeEntity.translation_code_id,
                        locale_id: translation.localeId,
                        value_development: translation.content,
                    }),
                ),
            );
            await optionalAwait(CacheService.clearCache(CachingKeys.translations));
            res.status(201).json();
        } catch (error) {
            if ((error as MysqlError).name === 'SequelizeUniqueConstraintError') {
                return unprocessableEntityError({
                    res,
                    title: 'translationCode should be unique inside group',
                });
            } else {
                return this.serverError(req, res, error as Error);
            }
        }
    }

    async updateTranslationForCountry(req: Request, res: Response) {
        req.checkBody('translationCodeId')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'translationCodeId is required',
            })
            .isInt()
            .withMessage({
                code: 'INVALID_VALUE',
                title: 'translationCodeId should be a number',
            });
        validateTranslations(req);
        if (await this.handleValidationResult(req, res)) {
            return;
        }

        const countryId = +req.params.countryId;
        const translationCodeId = req.body.translationCodeId as number;
        const translations = req.body.translations as { localeId: number; content: string }[];

        const [country, translationCode] = await Promise.all([
            getMainModels().Country.findByPk(countryId),
            getTranslationModels().TranslationCode.findByPk(translationCodeId),
        ]);
        if (!country) {
            return notFoundError({ res, title: 'Country not found' });
        }
        if (!translationCode) {
            return notFoundError({ res, title: 'Translation code not found' });
        }

        const existingLocalesCount = await getModels(country.country_code).Locale.count({
            where: {
                locale_id: translations.map(item => item.localeId),
                active: 1,
            },
        });
        if (existingLocalesCount !== translations.length) {
            return notFoundError({ res, title: 'Some of supplied localeIds are not found' });
        }

        await Promise.all(
            translations.map(translation =>
                getTranslationModels().TranslationValue.upsert({
                    translation_code_id: translationCode.translation_code_id,
                    locale_id: translation.localeId,
                    country_id: countryId,
                    value_development: translation.content,
                }),
            ),
        );
        res.json();
    }

    async copyTranslationValue(req: Request, res: Response) {
        const source = req.body.source as TranslationEnvironment;
        const target = req.body.target as TranslationEnvironment;
        const translationValueIds = req.body.translationValueIds as number[];
        validateSourceAndTarget(req);
        req.checkBody('action')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'action is required',
            })
            .custom((value: never) => {
                return value === 'publish';
            })
            .withMessage({
                code: 'INVALID_VALUE',
                title: 'only publish action is supported',
            });
        req.checkBody('translationValueIds')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'translationValueIds is required',
            })
            .isArray()
            .withMessage({
                code: 'INVALID_VALUE',
                title: 'translationValueIds should be an array',
            })
            .custom((translationValueIds: unknown[]) => {
                if (!(translationValueIds instanceof Array) || translationValueIds?.length <= 0) {
                    return false;
                }
                return translationValueIds.every(item => Number.isInteger(item));
            })
            .withMessage({
                code: 'INVALID_VALUE',
                title: 'translationValueIds should be array of ids',
            });
        if (await this.handleValidationResult(req, res)) {
            return;
        }

        await getTranslationModels().TranslationValue.update(
            {
                [`value_${target}`]: Sequelize.col(`value_${source}`),
            },
            {
                where: { translation_value_id: translationValueIds },
            },
        );
        await optionalAwait(CacheService.clearCache(CachingKeys.translations));

        res.json();
    }

    async updateTranslationsForLocales(req: Request, res: Response) {
        if (!(req.body instanceof Array) || req.body.length === 0) {
            return unprocessableEntityError({ res, title: 'body should be not empty array', source: { parameter: 'body' } });
        }

        if (!req.body.every(translation => Number.isInteger(translation.translationCodeId) && typeof translation.content === 'string')) {
            return unprocessableEntityError({
                res,
                title: "body should have format [{ translationCodeId: 2, content: 'text'",
                source: { parameter: 'body' },
            });
        }

        const translations = req.body as { translationCodeId: number; content: string }[];
        const localeId = +req.params.localeId as LocaleId;

        if (translations.length !== new Set(translations.map(item => item.translationCodeId)).size) {
            return unprocessableEntityError({
                res,
                title: 'there should be no duplicated translationCodeIds',
                source: { parameter: 'body' },
            });
        }

        if (!req.gemUser?.locales?.some(item => item.locale_id === localeId)) {
            return forbiddenError({ res, title: 'This user has no access to this locale' });
        }

        const existingCodeIdsCount = await getTranslationModels().TranslationCode.count({
            where: {
                translation_code_id: translations.map(item => item.translationCodeId),
            },
        });
        if (existingCodeIdsCount !== translations.length) {
            return notFoundError({ res, title: 'Some of supplied translationCodeIds is not found' });
        }

        await Promise.all(
            translations.map(translation =>
                getTranslationModels().TranslationValue.upsert({
                    translation_code_id: translation.translationCodeId,
                    locale_id: localeId,
                    value_development: translation.content,
                }),
            ),
        );

        res.json();
    }

    async deleteTranslation(req: Request, res: Response) {
        const deletedCount = await getTranslationModels().TranslationCode.destroy({
            where: { translation_code_id: req.params.translationCodeId },
        });
        if (deletedCount === 0) {
            return notFoundError({ res, title: 'translation with this translationCodeId is not found' });
        }
        await optionalAwait(CacheService.clearCache(CachingKeys.translations));
        res.status(204).json();
    }
}
