import { Request } from 'express';

export const sanitizeCompanyCreate = (req: Request) => {
    req.sanitizeBody('name').trim();
    req.sanitizeBody('address').trim();
    req.sanitizeBody('contactPerson').trim();
    req.sanitizeBody('contactEmail').trim();

    req.checkBody('name').notEmpty().withMessage({
        code: 'REQUIRED',
        title: 'company name is required',
    });

    req.checkBody('contactEmail').optional().isEmail().withMessage({
        code: 'INVALID_FORMAT',
        title: 'Invalid contact e-mail address',
    });
};

export const sanitizeVoucherGeneration = (req: Request) => {
    req.checkBody('count')
        .isNumeric()
        .withMessage({
            code: 'REQUIRED',
            title: 'count is required and should be a number',
        })
        .callback((value: number) => value > 0)
        .withMessage({
            code: 'INVALID_VALUE',
            title: 'count should be > 0',
        });

    req.checkBody('period')
        .isNumeric()
        .withMessage({
            code: 'REQUIRED',
            title: 'period is required and should be a number',
        })
        .callback((value: number) => value > 0)
        .withMessage({
            code: 'INVALID_VALUE',
            title: 'period should be > 0',
        });

    req.checkBody('monthPrice')
        .isNumeric()
        .withMessage({
            code: 'REQUIRED',
            title: 'month price is required and should be a number',
        })
        .callback((value: number) => value > 0)
        .withMessage({
            code: 'INVALID_VALUE',
            title: 'month price should be > 0',
        });
};
