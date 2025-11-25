import { Request } from 'express';
import { FetchPageInfo } from './fetch-page-info';

export const defaultPageSize = { min: 1, max: 100 };

export const hasBody = (req: Request) => {
    return ['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase());
};

export const validatePage = ({
    req,
    pageSize = defaultPageSize,
    optional = true,
}: {
    req: Request;
    pageSize?: { min: number; max: number };
    optional?: boolean;
}) => {
    const checkBody = hasBody(req);
    const checkMethod = checkBody ? req.checkBody : req.checkQuery;
    (optional ? checkMethod('page.size').optional().isInt(pageSize) : checkMethod('page.size').isInt(pageSize)).withMessage({
        code: 'INVALID_VALUE',
        title: `Page size must be a number between ${pageSize.min} and ${pageSize.max}`,
    });
    (optional ? checkMethod('page.number').optional().isInt({ min: 1 }) : checkMethod('page.number').isInt({ min: 1 })).withMessage({
        code: 'INVALID_VALUE',
        title: 'Page number must be a number > 0',
    });
    return FetchPageInfo.instance((checkBody ? req.body : req.query).page as Record<string, string>);
};
