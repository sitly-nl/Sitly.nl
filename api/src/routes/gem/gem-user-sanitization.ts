import { Request } from 'express';
import { GemUserRole } from '../../models/gem/gem-user.model';
import { ValidationRules } from '../../models/validation-rules';

const sanitizeGemUser = (req: Request) => {
    req.sanitizeBody('firstName').trim();
    req.sanitizeBody('lastName').trim();
    req.sanitizeBody('password').trim();

    const validators = [];

    validators.push(
        req
            .checkBody('email')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'E-mail is required',
            })
            .isEmail()
            .withMessage({
                code: 'INVALID_FORMAT',
                title: 'Invalid e-mail address',
            })
            .callback((value: string) => {
                if (value?.trim().endsWith('.ru')) {
                    return false;
                }
                return true;
            })
            .withMessage({
                code: 'NO_BOTS',
                title: 'Bots are not allowed on our platform',
            }),
    );

    validators.push(
        req.checkBody('firstName').notEmpty().withMessage({
            code: 'REQUIRED',
            title: 'First name is required',
        }),
    );

    validators.push(
        req.checkBody('lastName').notEmpty().withMessage({
            code: 'REQUIRED',
            title: 'Last name is required',
        }),
    );

    validators.push(
        req
            .checkBody('password')
            .optional()
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'Password is required',
            })
            .isLength(ValidationRules.user.password.length)
            .withMessage({
                code: 'INVALID_LENGTH',
                title: `Password length must be between ${ValidationRules.user.password.length.min} and ${ValidationRules.user.password.length.max} characters long`,
            }),
    );

    const roles = Object.values(GemUserRole);
    validators.push(
        req
            .checkBody('role')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'role is required',
            })
            .isIn(roles)
            .withMessage({
                code: 'INVALID_VALUE',
                title: `role must be one of ${roles.toString()}`,
            }),
    );

    validators.push(
        req
            .checkBody('countries')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'countries is required',
            })
            .isArray()
            .withMessage({
                code: 'INVALID_FORMAT',
                title: 'countries must be an array',
            }),
    );

    validators.push(
        req.checkBody('locales').optional().isArray().withMessage({
            code: 'INVALID_FORMAT',
            title: 'locales must be an array',
        }),
    );

    return validators;
};

export const sanitizeGemUserCreate = (req: Request) => {
    sanitizeGemUser(req);
    return req;
};

export const sanitizeGemUserUpdate = (req: Request) => {
    const validators = sanitizeGemUser(req);
    validators.forEach(validator => validator.optional());
    return req;
};
