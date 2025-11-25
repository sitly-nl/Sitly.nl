import { BrandCode } from './../models/brand-code';
import * as Sentry from '@sentry/node';
import { Environment } from './env-settings.service';

export type ExceptionType =
    | 'cache'
    | 'cron'
    | 'cron.chat-notifications.send-email'
    | 'cron.chat-notifications.send-notification'
    | 'cron.instant-job.send-notification'
    | 'ekomi'
    | 'emailEventsRoute'
    | 'features.cache'
    | 'features.growthbook'
    | 'job-xml.cache'
    | 'matchmail.calculate'
    | 'matchmail.send'
    | 'payment'
    | 'push-notification'
    | 'server error'
    | 'sitlyRouter'
    | 'text-analyzer.sensitivePhrasesIn.exclusions'
    | 'text-analyzer.sensitivePhrasesIn.phraseInternalString'
    | 'tracking'
    | 'user creation error';
export class SentryService {
    private static commonOptions: Sentry.NodeOptions = {
        dsn: 'https://b471031e02dc4d6489caef0ff56eba70@o56218.ingest.sentry.io/6368520',
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        release: `api@${require(process.cwd() + '/package.json').version}`,
        environment: Environment.environmentName,
        tracesSampler: samplingContext => {
            const url = samplingContext.request?.url;
            if (url?.includes('v2/main/') || url?.includes('v2/it/')) {
                if (!url?.includes('/users/me/updates')) {
                    return 0.01;
                }
            }
            return 0;
        },
        maxValueLength: 1000,
    };

    static init() {
        if (!Environment.isTest && !Environment.isProd) {
            return;
        }
        Sentry.init({
            ...SentryService.commonOptions,
            beforeSend(event) {
                const extra = event.extra as { body?: Record<string, unknown>; headers?: Record<string, unknown> };
                if (extra) {
                    delete extra.headers?.authorization;
                    delete extra.headers?.Authorization;
                    delete extra.body?.password;
                    delete extra.body?.email;
                }
                return event;
            },
        });
    }

    static initCrons() {
        if (!Environment.isTest && !Environment.isProd) {
            return;
        }
        Sentry.init(SentryService.commonOptions);
    }

    static captureException(exception: unknown, type: ExceptionType, brandCode: BrandCode, extra?: Record<string, unknown>) {
        if (!Environment.isTest && !Environment.isProd) {
            console.trace(exception);
            return;
        }
        Sentry.captureException(exception, {
            extra: {
                type,
                ...extra,
            },
            tags: {
                brandCode,
            },
        });
    }

    static async captureExceptionImmediately(
        exception: unknown,
        type: ExceptionType,
        brandCode: BrandCode,
        extra?: Record<string, unknown>,
    ) {
        if (!Environment.isTest && !Environment.isProd) {
            console.trace(exception);
            return;
        }
        SentryService.captureException(exception, type, brandCode, extra);
        await Sentry.flush();
    }
}
