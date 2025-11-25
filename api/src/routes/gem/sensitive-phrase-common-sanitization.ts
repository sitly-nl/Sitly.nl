import { Request } from 'express';

export const commonSanitizeSensitivePhraseSearch = (req: Request) => {
    const pageSize = { min: 1, max: 1000 };
    const allowedPageParams = ['size', 'number'];
    const phraseLimit = { min: 1, max: 50 };
    const allowedSortingParams = ['instance_id DESC', 'phrase'];

    allowedPageParams.forEach(filterParam => req.sanitizeQuery(filterParam).trim());

    const validators = [];

    validators.push(
        req
            .checkQuery('page')
            .optional()
            .custom((pageObject: object) => {
                return !Object.keys(pageObject).filter(pageKey => !allowedPageParams.includes(pageKey)).length;
            })
            .withMessage({
                code: 'INVALID_VALUE',
                title: `page must be one of ${allowedPageParams}`,
            }),
    );
    validators.push(
        req
            .checkQuery('page.size')
            .optional()
            .isInt(pageSize)
            .withMessage({
                code: 'INVALID_VALUE',
                title: `page size must be a number between ${pageSize.min} and ${pageSize.max}`,
            }),
    );
    validators.push(
        req.checkQuery('page.number').optional().isInt().withMessage({
            code: 'INVALID_VALUE',
            title: 'Page number must be a number',
        }),
    );
    validators.push(
        req
            .checkQuery('filter.phrase')
            .optional()
            .isString()
            .isLength(phraseLimit)
            .withMessage({
                code: 'INVALID_VALUE',
                title: `phrase must be a string with length between ${phraseLimit.min} and ${phraseLimit.max}`,
            }),
    );
    validators.push(
        req
            .checkQuery('orderBy')
            .optional()
            .isString()
            .isIn(allowedSortingParams)
            .withMessage({
                code: 'INVALID_VALUE',
                title: `sort must be one of ${allowedSortingParams}`,
            }),
    );

    return validators;
};
