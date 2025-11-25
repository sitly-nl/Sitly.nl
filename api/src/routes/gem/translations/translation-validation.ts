import { Request } from 'express';
import { hasBody } from '../../common-validators';
import { allTranslationEnvironments } from './translations';

export const validateTranslations = (req: Request) => {
    req.checkBody('translations')
        .notEmpty()
        .withMessage({
            code: 'REQUIRED',
            title: 'translations is required',
        })
        .isArray()
        .withMessage({
            code: 'INVALID_VALUE',
            title: 'translations should be an array',
        })
        .custom((translations: { localeId: unknown; content: unknown }[]) => {
            if (!(translations instanceof Array) || translations?.length <= 0) {
                return false;
            }
            return translations.every(translation => {
                return Number.isInteger(translation.localeId) && typeof translation.content === 'string' && translation.content.length > 0;
            });
        })
        .withMessage({
            code: 'INVALID_VALUE',
            title: "translations should be not empty array with format [{ localeId: 2, content: 'English text' }]",
        })
        .custom((translations: { localeId: unknown; content: unknown }[]) => {
            if (!(translations instanceof Array)) {
                return false;
            }
            return translations.length === new Set(translations.map(item => item.localeId)).size;
        })
        .withMessage({
            code: 'INVALID_VALUE',
            title: 'translations should not have duplicated localeId',
        });
};

export const validateSourceAndTarget = (req: Request) => {
    const checkBody = hasBody(req);
    const checkMethod = checkBody ? req.checkBody : req.checkQuery;
    checkMethod('source')
        .notEmpty()
        .withMessage({
            code: 'REQUIRED',
            title: 'source is required',
        })
        .custom((value: never) => {
            return allTranslationEnvironments.includes(value);
        })
        .withMessage({
            code: 'INVALID_VALUE',
            title: `source should one of ${allTranslationEnvironments}`,
        });
    checkMethod('target')
        .notEmpty()
        .withMessage({
            code: 'REQUIRED',
            title: 'target is required',
        })
        .custom((value: never) => {
            return allTranslationEnvironments.includes(value);
        })
        .withMessage({
            code: 'INVALID_VALUE',
            title: `target should one of ${allTranslationEnvironments}`,
        })
        .custom((value: never) => {
            return checkBody ? value !== req.body.source : value !== req.query.source;
        })
        .withMessage({
            code: 'INVALID_VALUE',
            title: 'target should be different than the source',
        });
};
