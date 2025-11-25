import { Request } from 'express';
import { ErrorObject, ValidationError } from '../route';
import { getModels } from '../../sequelize-connections';
import { UserWarningLevel } from '../../types';
import { commonSanitizeSensitivePhraseSearch } from './sensitive-phrase-common-sanitization';

export enum SensitivePhraseRouteAction {
    create = 'create',
    update = 'update',
    search = 'search',
    delete = 'delete',
}

const allowedSearchParams = ['filter', 'orderBy', 'page'];
const allowedFilterParams = ['types', 'phrase'];
const allowedCreateParams = ['phrase', 'type'];
const allowedDeleteParams = ['ids'];
const allowedTypes = [UserWarningLevel.moderate, UserWarningLevel.severe, UserWarningLevel.blocked];

export const sanitizeSensitivePhraseSearch = (req: Request) => {
    const validators = [];

    allowedFilterParams.forEach(filterParam => req.sanitizeQuery(filterParam).trim());

    validators.push(
        req
            .checkQuery('filter')
            .optional()
            .custom((filterObject: object) => {
                return !Object.keys(filterObject).filter(filterKey => !allowedFilterParams.includes(filterKey)).length;
            })
            .withMessage({
                code: 'INVALID_VALUE',
                title: `filter must be one of ${allowedFilterParams}`,
            }),
    );
    validators.push(
        req.checkQuery('filter.types').optional().isArray().withMessage({
            code: 'INVALID_VALUE',
            title: 'types must be an array',
        }),
    );
    validators.push(
        req
            .checkQuery('filter.types')
            .optional()
            .custom((typesArray: UserWarningLevel[]) => {
                return Array.isArray(typesArray) && !typesArray.filter(type => !allowedTypes.includes(type)).length;
            })
            .withMessage({
                code: 'INVALID_VALUE',
                title: `types must be an array containing one or more of ${allowedTypes}`,
            }),
    );

    validators.push(...commonSanitizeSensitivePhraseSearch(req));

    return validators;
};

export const sanitizeSensitivePhraseCreate = (req: Request) => {
    allowedCreateParams.forEach(createParam => req.sanitizeQuery(createParam).trim());
    const phraseLimit = { min: 1, max: 50 };

    const validators = [];
    validators.push(
        req
            .checkBody('phrase')
            .isLength(phraseLimit)
            .withMessage({
                code: 'INVALID_VALUE',
                title: `phrase must be a string with length between ${phraseLimit.min} and ${phraseLimit.max}`,
            })
            .custom(async (phrase: string) => {
                if (!phrase) {
                    return true;
                }
                const foundPhrase = await getModels(req.brandCode).SensitivePhrase.byPhrase(phrase);
                if (foundPhrase) {
                    throw new Error('Phrase already exist in DB');
                }
                return true;
            })
            .withMessage({
                code: 'DUPLICATE_ENTRY',
                title: 'Phrase already exist in DB',
            })
            .custom(async (phrase: string) => {
                if (!phrase) {
                    return true;
                }
                const foundPhrase = await getModels(req.brandCode).SensitivePhraseExclusion.byPhrase(phrase);
                if (foundPhrase) {
                    throw new Error('Phrase already exist in DB');
                }
                return true;
            })
            .withMessage({
                code: 'DUPLICATE_ENTRY',
                title: 'Phrase already exist in Exclusions',
            }),
    );

    validators.push(
        req
            .checkBody('type')
            .isIn(allowedTypes)
            .withMessage({
                code: 'INVALID_VALUE',
                title: `type must be one of ${allowedTypes}`,
            }),
    );
    return validators;
};

export const sanitizeSensitivePhraseDelete = (req: Request) => {
    const validators = [];
    allowedDeleteParams.forEach(createParam => req.sanitizeQuery(createParam).trim());

    validators.push(
        req
            .checkBody('ids')
            .isArray()
            .withMessage({
                code: 'INVALID_VALUE',
                title: 'Ids must be an array',
            })
            .notEmpty()
            .withMessage({
                code: 'INVALID_VALUE',
                title: 'Ids must be a non empty array',
            })
            .custom((ids: unknown[]) => {
                for (const id of ids) {
                    if (!Number.isInteger(id)) {
                        return false;
                    }
                }
                return true;
            })
            .withMessage({
                code: 'INVALID_VALUE',
                title: 'Ids must be integers',
            })
            .custom((ids: number[]) => {
                const uniqueIds = new Set(ids);
                return ids.length === uniqueIds.size;
            })
            .withMessage({
                code: 'INVALID_VALUE',
                title: 'Ids must not contain duplicate values',
            }),
    );
    return validators;
};

const actions = {
    search: {
        params: allowedSearchParams,
        sanitizer: sanitizeSensitivePhraseSearch,
    },
    create: {
        params: allowedCreateParams,
        sanitizer: sanitizeSensitivePhraseCreate,
    },
    update: {
        params: allowedCreateParams,
        sanitizer: sanitizeSensitivePhraseCreate,
    },
    delete: {
        params: allowedDeleteParams,
        sanitizer: sanitizeSensitivePhraseDelete,
    },
};

const forbiddenFieldsErrors = (reqParams: object, allowedFields: string[]) => {
    const forbiddenProperties = Object.keys(reqParams).filter(bodyParam => {
        return allowedFields.indexOf(bodyParam) < 0;
    });

    return forbiddenProperties.map(prop => ({
        code: 'INVALID_FIELD',
        source: { parameter: encodeURIComponent(prop) },
    }));
};

export const getSensitivePhraseSanitizationResults = async (
    action: SensitivePhraseRouteAction,
    req: Request,
    errorMapper: (error: ValidationError) => ErrorObject,
) => {
    const allowedParams = actions[action].params;
    const reqParams = (action === SensitivePhraseRouteAction.search ? req.query : req.body) as object;
    const fieldErrors = forbiddenFieldsErrors(reqParams, allowedParams);
    if (fieldErrors.length) {
        return fieldErrors;
    }

    const sanitizeErrors = [];
    const validators = actions[action].sanitizer(req);
    if (action === SensitivePhraseRouteAction.update) {
        validators.forEach(validator => validator.optional());
    }
    const validationResult = await req.getValidationResult();
    if (!validationResult.isEmpty()) {
        sanitizeErrors.push(...validationResult.array().map(errorMapper));
    }

    return sanitizeErrors;
};
