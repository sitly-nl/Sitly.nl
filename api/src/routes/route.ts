import { Request, Response } from 'express';
import { Error as JSONAPIError } from 'jsonapi-serializer';
import { includeError, IncludeError, serverError, UnprocessableEntityError } from '../services/errors';
import { CustomUserRelations } from '../models/user/custom-user.model';
import { ZodError, ZodInvalidUnionIssue } from 'zod';

export interface ErrorObject {
    code: string;
    title?: string;
    meta?: unknown;
    source: { parameter: string };
}

export interface ValidationError {
    msg: { code: string; title?: string };
    param: string;
    value?: unknown;
    meta?: unknown;
}
export class BaseRoute {
    protected userPublicAllowedIncludes: (keyof CustomUserRelations)[] = ['place', 'children', 'references', 'recommendations', 'photos'];
    protected userPrivateAllowedIncludes: (keyof CustomUserRelations)[] = [...this.userPublicAllowedIncludes, 'subscription'];

    protected serverError(req: Request, res: Response, error?: Error) {
        serverError(req, res, error);
    }

    protected static errorMapper(error: ValidationError) {
        const mappedError: ErrorObject = Object.assign(error.msg, {
            source: { parameter: error.param },
        });

        if (error.meta) {
            mappedError.meta = error.meta;
        }

        return mappedError;
    }

    protected getIncludes<T extends string>(req: Request, possibleIncludes: T[]): T[] {
        let includes = (req.query.include ? (req.query.include as string).split(',') : []) as T[];

        const splitParts = (str: T) => {
            return str.split('.').reduce((acc, current, i) => {
                const prev = acc[i - 1] ?? '';
                acc.push((prev ? `${prev}.${current}` : current) as T);
                return acc;
            }, [] as T[]);
        };

        includes.forEach(include => includes.push(...splitParts(include)));
        includes = includes.filter((el: string, i: number, a: string[]) => i === a.indexOf(el));
        possibleIncludes.forEach(possibleInclude => possibleIncludes.push(...splitParts(possibleInclude)));

        const unknownInclude = includes.find(include => !possibleIncludes.includes(include));
        if (unknownInclude) {
            throw new IncludeError(`${unknownInclude} cannot be included`);
        }
        return includes;
    }

    protected async handleValidationResult(req: Request, res: Response, additionalErrors: ValidationError[] = []) {
        const validationResult = await req.getValidationResult();
        const errors = [...(validationResult.array() as ValidationError[]), ...additionalErrors];
        if (errors.length) {
            res.status(422);
            const serializedErrors = JSONAPIError(errors.map(BaseRoute.errorMapper));
            res.json(serializedErrors);
            return serializedErrors;
        }
        return null;
    }

    handleError(req: Request, res: Response, error: unknown) {
        if (error instanceof ZodError) {
            const issues = [];
            for (const item of error.issues) {
                const invalidUnionIssue = item as ZodInvalidUnionIssue;
                for (const unionError of invalidUnionIssue.unionErrors ?? []) {
                    for (const issue of unionError.issues) {
                        if (issue.code === 'invalid_type' && issue.received !== 'undefined') {
                            issues.push(issue);
                        }
                    }
                }
                issues.push(item);
            }
            const mappedErrors = issues.map(item => {
                return {
                    code: 'INVALID_VALUE',
                    title: item.message,
                    ...(item.path[0] ? { source: { parameter: item.path[0] } } : {}),
                };
            });
            res.status(422).json(JSONAPIError(mappedErrors));
        } else if (error instanceof UnprocessableEntityError) {
            res.status(422).json(JSONAPIError(error));
        } else if (error instanceof IncludeError) {
            includeError(res, error);
        } else {
            serverError(req, res, error as never);
        }
    }
}
