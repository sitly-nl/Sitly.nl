import { Request } from 'express';
import { PSP } from '../../models/payment.model';
import { ErrorObject, ValidationError } from '../route';
import { UserUpdatableProperties } from '../user-updatable-properties';
import { Util } from '../../utils/util';
import { sanitizeUserUpdate } from '../users/user-update-sanitization';
import { UserWarningLevel } from '../../types';
import { UserWarningType } from '../../models/user-warning.model';
import { User, WebRoleName, allUserRoles } from '../../models/user/user.model';

export const allowedFilterParams = [
    'email',
    'placeUrl',
    'firstName',
    'lastName',
    'roles',
    'paymentPlatforms',
    'blocked',
    'hidden',
    'male',
    'premium',
    'webuserUrl',
    'quarantined',
];

export const sanitizeSitlyUserSearch = (req: Request) => {
    allowedFilterParams.forEach(filterParam => req.sanitizeQuery(filterParam).trim());

    const firstNameLength = { min: 0, max: 50 };
    const lastNameLength = { min: 0, max: 50 };
    const emailLength = { min: 4, max: 50 };
    const placeLength = { min: 0, max: 50 };

    req.checkQuery('filter').notEmpty().withMessage({
        code: 'REQUIRED',
        title: 'At least one filter is required',
    });

    req.checkQuery('filter')
        .custom((filterValue: Record<string, unknown>) => {
            const suppliedFilterKeys = Object.keys(filterValue ?? {});
            return suppliedFilterKeys.every(filterKey => allowedFilterParams.includes(filterKey));
        })
        .withMessage({
            code: 'INVALID_VALUE',
            title: `filters must be in ${allowedFilterParams}`,
        });

    req.checkQuery('filter.email')
        .optional()
        .isLength(emailLength)
        .withMessage({
            code: 'INVALID_VALUE',
            title: `Email should be a string with length between ${emailLength.min} and ${emailLength.max}`,
        });

    req.checkQuery('filter.firstName')
        .optional()
        .isLength(firstNameLength)
        .withMessage({
            code: 'INVALID_LENGTH',
            title: `First name must be between ${firstNameLength.min} and ${firstNameLength.max} characters long`,
        })
        .matches(/^[^0-9@]+$/)
        .withMessage({
            code: 'INVALID_VALUE',
            title: 'First name may not contain @ or numbers',
        });

    req.checkQuery('filter.lastName')
        .optional()
        .isLength(lastNameLength)
        .withMessage({
            code: 'INVALID_LENGTH',
            title: `Last name must be between ${lastNameLength.min} and ${lastNameLength.max} characters long`,
        })
        .matches(/^[^0-9@]+$/)
        .withMessage({
            code: 'INVALID_VALUE',
            title: 'First name may not contain @ or numbers',
        });

    req.checkQuery('filter.placeUrl')
        .optional()
        .matches(/^[^0-9@]+$/)
        .withMessage({
            code: 'INVALID_VALUE',
            title: 'Place may not contain @ or numbers',
        })
        .isLength(placeLength)
        .withMessage({
            code: 'INVALID_LENGTH',
            title: `Place must be between ${placeLength.min} and ${placeLength.max} characters long`,
        });

    req.checkQuery('filter.premium').optional().custom(Util.isBooly).withMessage({
        code: 'INVALID_VALUE',
        title: 'Premium must be boolean value',
    });
    req.checkQuery('filter.premium').toBoolean();

    req.checkQuery('filter.blocked').optional().custom(Util.isBooly).withMessage({
        code: 'INVALID_VALUE',
        title: 'Blocked must be boolean value',
    });
    req.checkQuery('filter.blocked').toBoolean();

    req.checkQuery('filter.hidden').optional().custom(Util.isBooly).withMessage({
        code: 'INVALID_VALUE',
        title: 'Hidden must be boolean value',
    });
    req.checkQuery('filter.hidden').toBoolean();

    req.checkQuery('filter.male').optional().custom(Util.isBooly).withMessage({
        code: 'INVALID_VALUE',
        title: 'Male must be boolean value',
    });
    req.checkQuery('filter.male').toBoolean();

    req.checkQuery('filter.paymentPlatforms')
        .optional()
        .isArray()
        .withMessage({
            code: 'INVALID_FORMAT',
            title: 'Payment platforms must be provided in an array',
        })
        .custom((paymentPlatformsArray: PSP[]) => {
            if (!Array.isArray(paymentPlatformsArray)) {
                return false;
            }
            const allowedPlatforms = Object.values(PSP);
            const nonExistingPlatform = paymentPlatformsArray.filter(requestedPlatform => !allowedPlatforms.includes(requestedPlatform));
            return !nonExistingPlatform.length;
        })
        .withMessage({
            code: 'INVALID_VALUE',
            title: 'Payment platforms array must contain only PSP values',
        });

    req.checkQuery('filter.roles')
        .optional()
        .isArray()
        .withMessage({
            code: 'INVALID_FORMAT',
            title: 'Roles must be provided in an array',
        })
        .custom((rolesArray: WebRoleName[]) => {
            if (!Array.isArray(rolesArray)) {
                return false;
            }
            const nonExistingRoles = rolesArray.filter(requestedRole => !allUserRoles.includes(requestedRole));
            return !nonExistingRoles.length;
        })
        .withMessage({
            code: 'INVALID_VALUE',
            title: 'Roles array must contain only existing roles',
        });
};

const forbiddenFieldsErrors = (req: Request, sitlyUser: User) => {
    const updatableProperties = UserUpdatableProperties.getSitlyUserUpdatableProperties(sitlyUser);
    const forbiddenProperties = Object.keys(req.body as object).filter(item => {
        return updatableProperties.indexOf(item) < 0;
    });

    return forbiddenProperties.map(prop => ({
        code: 'INVALID_FIELD',
        source: { parameter: encodeURIComponent(prop) },
    }));
};

export const getUserUpdateSanitizationResults = async (
    req: Request,
    sitlyUser: User,
    errorMapper: (error: ValidationError) => ErrorObject,
) => {
    const fieldErrors = forbiddenFieldsErrors(req, sitlyUser);
    if (fieldErrors.length) {
        return fieldErrors;
    }

    const sanitizeErrors = [];
    sanitizeUserUpdate(req);
    const validationResult = await req.getValidationResult();
    if (!validationResult.isEmpty()) {
        sanitizeErrors.push(...validationResult.array().map(errorMapper));
    }

    return sanitizeErrors;
};

export const sanitizeIncludeUsers = (req: Request) => {
    req.checkQuery('filter.includeUsers').optional().isArray().withMessage({
        code: 'INVALID_FORMAT',
        title: 'includeUsers must be an array',
    });
};

export const sanitizeSitlyUserWarningListSearch = (req: Request) => {
    const allowedSearchTypes = [...Object.values(UserWarningLevel), 'suspected'];
    const allowedWarningTypes = Object.values(UserWarningType);
    req.checkParams('searchType')
        .isIn(allowedSearchTypes)
        .withMessage({
            code: 'INVALID_VALUE',
            title: `Invalid searchType, must be one of ${allowedSearchTypes}`,
        });

    req.checkQuery('page.limit').optional().isInt({ min: 1 });

    req.checkQuery('page.created-before').optional().isISO8601().withMessage({
        code: 'INVALID_FORMAT',
        title: 'Value must be a valid ISO 8601 date',
    });

    sanitizeIncludeUsers(req);

    req.checkQuery('filter.warningType')
        .optional()
        .isIn(allowedWarningTypes)
        .withMessage({
            code: 'INVALID_VALUE',
            title: `Invalid warningType, must be one of ${allowedWarningTypes}`,
        });

    req.checkQuery('filter.role')
        .optional()
        .isIn(allUserRoles)
        .withMessage({
            code: 'INVALID_VALUE',
            title: `Invalid role, must be one of ${allUserRoles}`,
        });
};
