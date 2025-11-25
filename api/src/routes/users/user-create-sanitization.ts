import { UserCreationType } from './users-create';
import { Request } from 'express';
import { BrandCode } from '../../models/brand-code';
import { ValidationRules } from '../../models/validation-rules';
import { allUserRoles } from '../../models/user/user.model';

export const sanitizeUserCreate = (req: Request, type: UserCreationType) => {
    if (type === UserCreationType.googleCode || type === UserCreationType.googleToken) {
        return;
    }

    req.sanitizeBody('firstName').trim();
    req.sanitizeBody('lastName').trim();
    req.sanitizeBody('password').trim();

    req.checkBody('role')
        .optional()
        .isIn(allUserRoles)
        .withMessage({
            code: 'INVALID_VALUE',
            title: `Role must be one of ${allUserRoles}`,
        });

    if (type === UserCreationType.facebookToken) {
        req.checkBody('email').optional().isEmail().withMessage({
            code: 'INVALID_FORMAT',
            title: 'Invalid e-mail address',
        });
    } else if (type === UserCreationType.general) {
        req.checkBody('email')
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
            });

        req.checkBody('password')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'Password is required',
            })
            .isLength({ min: ValidationRules.user.password.length.min })
            .withMessage({
                code: 'INVALID_LENGTH',
                title: `Password length must be greater than ${ValidationRules.user.password.length.min} characters`,
            });
    }
    if (type !== UserCreationType.facebookToken && !req.body.minimalSignup) {
        req.checkBody('firstName')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'First name is required',
            })
            .isLength(ValidationRules.user.firstName.length)
            .withMessage({
                code: 'INVALID_LENGTH',
                title: `First name must be between ${ValidationRules.user.firstName.length.min} and ${ValidationRules.user.firstName.length.max} characters long`,
            })
            .callback((value: string) => {
                const REGEX_CHINESE =
                    /[\u4e00-\u9fff]|[\u3400-\u4dbf]|[\u{20000}-\u{2a6df}]|[\u{2a700}-\u{2b73f}]|[\u{2b740}-\u{2b81f}]|[\u{2b820}-\u{2ceaf}]|[\uf900-\ufaff]|[\u3300-\u33ff]|[\ufe30-\ufe4f]|[\uf900-\ufaff]|[\u{2f800}-\u{2fa1f}]/u;
                return req.brandCode === BrandCode.malaysia || !REGEX_CHINESE.test(value);
            })
            .withMessage({
                code: 'NO_BOTS',
                title: 'Bots are not allowed on our platform',
            })
            .matches(/^[^0-9@]+$/)
            .withMessage({
                code: 'INVALID_VALUE',
                title: 'First name may not contain @ or numbers',
            });

        req.checkBody('lastName')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'Last name is required',
            })
            .isLength(ValidationRules.user.lastName.length)
            .withMessage({
                code: 'INVALID_LENGTH',
                title: `Last name must be between ${ValidationRules.user.lastName.length.min} and ${ValidationRules.user.lastName.length.max} characters long`,
            })
            .matches(/^[^0-9@]+$/)
            .withMessage({
                code: 'INVALID_VALUE',
                title: 'Last name may not contain @ or numbers',
            });
    }
};
