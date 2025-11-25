import { Request, Response } from 'express';
import { Error as JSONAPIError } from 'jsonapi-serializer';
import { SentryService } from './sentry.service';
import { Environment } from './env-settings.service';
import { SlackChannels, SlackNotifications } from './slack-notifications.service';

export class IncludeError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'IncludeError';
    }
}

export interface HttpError extends Error {
    status?: number;
    code?: string;
}

export class UnprocessableEntityError extends Error {
    title?: string;
    code: string;
    source?: unknown;
    meta?: unknown;

    constructor(input: Omit<ErrorCreateInterface, 'res'>) {
        super(input.title);
        this.title = input.title;
        this.code = input.code ?? 'INVALID_VALUE';
        this.source = input.source;
        this.meta = input.meta;
    }
}

interface ErrorCreateInterface {
    res: Response;
    title?: string;
    code?: string;
    source?: unknown;
    meta?: unknown;
}

// ---- 400 ---- //
export const badRequest = ({ res, title, code = 'BAD_REQUEST', meta }: ErrorCreateInterface) => {
    const error: Record<string, unknown> = {
        code,
        title,
    };
    if (meta) {
        error.meta = meta;
    }
    res.status(400);
    res.json(JSONAPIError(error));
};

export const multipleCountrySignIn = ({ res, countryCodes }: { res: Response; countryCodes: string[] }) => {
    badRequest({ res, title: 'Email used in more than one country', meta: { countryCodes } });
};

// ---- 4xx ---- //
export const unauthorized = ({ res, title = 'Invalid Credentials', code = 'INVALID_CREDENTIALS' }: ErrorCreateInterface) => {
    res.status(401);
    res.json(
        JSONAPIError({
            code,
            title,
        }),
    );
};

export const forbiddenError = ({ res, title, code = 'FORBIDDEN' }: ErrorCreateInterface) => {
    res.status(403);
    res.json(
        JSONAPIError({
            code,
            title,
        }),
    );
};

export const notFoundError = ({ res, title, code = 'NOT_FOUND' }: ErrorCreateInterface) => {
    res.status(404);
    res.json(
        JSONAPIError({
            code,
            title,
        }),
    );
};

// ---- 422 ---- //
export const unprocessableEntityError = ({ res, title, code = 'INVALID_VALUE', source }: ErrorCreateInterface) => {
    const error: Record<string, unknown> = {
        code,
        title,
    };
    if (source) {
        error.source = source;
    }
    res.status(422);
    res.json(JSONAPIError(error));
};

export const duplicateEmailError = (res: Response) => {
    unprocessableEntityError({
        res,
        code: 'DUPLICATE_EMAIL',
        title: 'This e-mail already exists',
        source: {
            parameter: 'email',
        },
    });
};

export const includeError = (res: Response, error: IncludeError) => {
    return unprocessableEntityError({ res, title: error.message, source: { parameter: 'include' } });
};

// ---- 42x ---- //
export const rateLimitError = ({ res, title }: ErrorCreateInterface) => {
    res.status(429);
    res.json(
        JSONAPIError({
            code: 'RATE_LIMIT_EXCEEDED',
            title,
        }),
    );
};

// ---- 500 ---- //
export const serverError = (req: Request, res: Response, error?: Error) => {
    if (error) {
        SentryService.captureException(error, 'server error', req.brandCode, {
            url: req.url,
            headers: req.headers,
            body: req.body,
        });
    }
    res.status(500);
    res.json(
        JSONAPIError({
            code: 'INTERNAL_SERVER_ERROR',
            title: 'Internal server error',
        }),
    );
};

// ---- Handling ---- //
export const capturePaymentError = (req: Request, error: Error) => {
    SentryService.captureException(error, 'payment', req.brandCode, {
        url: req.url,
        headers: req.headers,
        body: req.body,
    });
    if (Environment.isProd) {
        let curlString = `curl '${req.protocol}://${req.get('host')}${req.originalUrl}' -X ${req.method}`;
        Object.keys(req.headers).forEach(headerName => {
            curlString += ` -H '${headerName}: ${req.headers[headerName]}'`;
        });
        curlString += ` -d '${JSON.stringify(req.body)}'`;
        SlackNotifications.send(
            `*Error during processing payment <@U72HR28B0> <@U0JEG5B7U>:*\n brandCode=${req.brandCode}\n${error as never}\n${curlString}`,
            SlackChannels.paymentMonitoring,
        );
    }
};
