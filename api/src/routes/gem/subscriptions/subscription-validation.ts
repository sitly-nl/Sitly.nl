import { Request } from 'express';
import { config } from '../../../../config/config';
import { allUserRoleIds } from '../../../models/user/user.model';

export const validateCreate = (req: Request) => {
    return [
        ...commonValidation(req),
        req
            .checkBody('webroleId')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'webroleId is required',
            })
            .custom((value: never) => {
                return allUserRoleIds.includes(value);
            })
            .withMessage({
                code: 'INVALID_VALUE',
                title: `webroleId must be one of ${allUserRoleIds}`,
            }),
        req
            .checkBody('maxAge')
            .optional()
            .custom((value: never) => {
                return Number.isFinite(value) && value > config.getConfig(req.brandCode).babysitterMinAge && value < 128;
            })
            .withMessage({
                code: 'INVALID_VALUE',
                title: `maxAge must be number between ${config.getConfig(req.brandCode).babysitterMinAge} and 128`,
            }),
        req
            .checkBody('showInOverview')
            .optional()
            .custom((value: never) => {
                return [0, 1].includes(value);
            })
            .withMessage({
                code: 'INVALID_VALUE',
                title: 'showInOverview must be 0 or 1',
            }),
    ];
};

export const validateUpdate = (req: Request) => validateCreate(req).forEach(validator => validator.optional());

export const validateCreateTestVariant = (req: Request) => {
    return [
        ...commonValidation(req),
        req
            .checkBody('abTestId')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'abTestId is required',
            })
            .isString()
            .withMessage({
                code: 'INVALID_VALUE',
                title: 'abTestId should be a string',
            }),
    ];
};

// ---- Internal ---- //
export const commonValidation = (req: Request) => {
    const durationOptions = ['days', 'weeks', 'months', 'years'];
    return [
        req
            .checkBody('duration')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'duration is required',
            })
            .custom((value: never) => {
                return Number.isInteger(value) && value > 0;
            })
            .withMessage({
                code: 'INVALID_VALUE',
                title: 'duration should be a numer > 0',
            }),
        req
            .checkBody('durationUnit')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'durationUnit is required',
            })
            .isIn(durationOptions)
            .withMessage({
                code: 'INVALID_VALUE',
                title: `durationUnit should be one of ${durationOptions}`,
            }),
        req
            .checkBody('pricePerUnit')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'pricePerUnit is required',
            })
            .custom((value: never) => {
                return Number.isFinite(value) && value > 0;
            })
            .withMessage({
                code: 'INVALID_VALUE',
                title: 'pricePerUnit should be a numer > 0',
            }),
    ];
};
