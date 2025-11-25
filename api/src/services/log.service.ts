import { User } from './../models/user/user.model';
import { Client } from '@elastic/elasticsearch';
import { BrandCode } from '../models/brand-code';
import { GeocodeProvider } from './geocode/geocode-parser-interface';
import { Environment } from './env-settings.service';
import { ElasticSearchResponse } from './elastic.service';
import { RequestUtil } from '../utils/request-util';
import { OptionalUserRequest, UserRequest } from './auth.service';
import { Request } from 'express';
import { StringUtil } from '../utils/string-util';

export interface ElasticLog {
    created_at: string;
    label: string;
    message: string;
    user_id?: number;
    request_details?: {
        url: string;
        method: string;
        headers: unknown;
        ip: string;
        request_body: string;
    };
    details: Record<string, unknown>;
}

const client = new Client(Environment.apiKeys.elasticsearch_logs);

export enum CustomLogType {
    registrationQuestion = 'registration-question',
    userUpdate = 'user-update',
    clientError = 'client-error',
}

export class LogService {
    static async logRequest({
        req,
        label,
        message,
        details = {},
        refresh = false,
        customId,
        ...params
    }: {
        label: string;
        message?: string;
        details?: Record<string, unknown>;
        refresh?: boolean;
        customId?: string;
    } & ({ req: UserRequest | OptionalUserRequest } | { req: Request; user: User | undefined })) {
        // remove sensitive information
        const requestBody = JSON.parse(JSON.stringify(req.body)) as Record<string, string>;
        if (requestBody.password) {
            delete requestBody.password;
            delete requestBody.email;
        }
        if (requestBody.avatar) {
            requestBody.avatar = '--stripped--';
        }

        // utm tag logging
        Object.keys(requestBody).forEach(field => {
            if (field.startsWith('utm') && requestBody[field].length > 0) {
                details[StringUtil.snakeCase(field)] =
                    requestBody[field]?.length > 100 ? requestBody[field].substring(0, 99) + '--stripped--' : requestBody[field];
            }
        });

        Object.entries(RequestUtil.userAgentInfo(req)).forEach(([key, value]) => {
            if (value) {
                details[key] = value;
            }
        });

        const requestDetails = {
            url: req.url,
            method: req.method,
            headers: { ...req.headers },
            ip: (req.headers['x-forwarded-for'] as string) ?? req.socket.remoteAddress,
            request_body: JSON.stringify(requestBody),
        };
        delete requestDetails.headers.authorization;
        delete requestDetails.headers.Authorization;

        return LogService.log({
            brandCode: req.brandCode,
            label,
            message,
            user: ('user' in params ? params.user : undefined) ?? ('user' in req ? req.user : undefined),
            details,
            requestDetails,
            refresh,
            customId,
        });
    }

    static async log({
        brandCode,
        label,
        message,
        user,
        details = {},
        requestDetails,
        refresh = false,
        customId,
    }: {
        brandCode: BrandCode;
        label: string;
        message?: string;
        user?: User;
        details?: Record<string, unknown>;
        requestDetails?: {
            url: string;
            method: string;
            headers: unknown;
            ip: string;
            request_body: string;
        };
        refresh?: boolean;
        customId?: string;
    }) {
        if (typeof message !== 'string' && typeof message !== 'undefined') {
            console.warn(`log.message is not a string, automatically converting ${typeof message} to string for label '${label}'`);
            message = JSON.stringify(message);
        }

        const restrictedLabels = ['password', 'firstName', 'lastName', 'about'];
        const validatedMessage = restrictedLabels.some(item => label.includes(item)) ? '--stripped--' : message;
        const body: ElasticLog = {
            created_at: new Date().toISOString(),
            label,
            message: validatedMessage ?? '',
            details,
        };

        if (requestDetails) {
            body.request_details = requestDetails;
        }

        if (user) {
            body.user_id = user.webuser_id;
            // only log user updates in the registration process once
            if (label.startsWith('user.update') && user.customUser.completed === 0) {
                const existingLog = await this.logsForUser(user.webuser_id, brandCode, refresh, label);

                if (existingLog?.hits.hits.length) {
                    return;
                }
            }
        }

        const id = customId ?? `${new Date().getTime()}${StringUtil.randomString(5)}`;
        return client.create({
            index: `${Environment.apiKeys.elasticsearch_log_index_prefix}-${brandCode}`,
            type: '_doc',
            id,
            body,
            refresh,
        });
    }

    static logGeo(
        provider: GeocodeProvider | '-',
        type: 'address' | 'postalcode' | 'placename-by-postalcode' | 'coords-by-postalcode' | 'placename' | 'reverse',
        country: string,
        searchString: string,
        isRetry: boolean,
    ) {
        const body: ElasticLog = {
            created_at: new Date().toISOString(),
            label: `geocode-${provider}-${type}${isRetry ? '-retry' : ''}`,
            details: {
                country,
            },
            message: searchString,
        };

        return client.create({
            index: `${Environment.apiKeys.elasticsearch_log_index_prefix}-main`,
            type: '_doc',
            id: `${new Date().getTime()}${StringUtil.randomString(5)}`,
            body,
        });
    }

    static async logsForUser(userId: number, brandCode: BrandCode, refreshIndex = true, label?: string) {
        if (refreshIndex) {
            await client.indices.refresh({
                index: `${Environment.apiKeys.elasticsearch_log_index_prefix}-${brandCode}`,
            });
        }
        const query = {
            bool: {
                must: [{ term: { user_id: userId } }] as Record<string, unknown>[],
            },
        };

        if (label) {
            query.bool.must.push({
                term: { label },
            });
        }
        const result = await client.search<ElasticSearchResponse<ElasticLog>>({
            index: `${Environment.apiKeys.elasticsearch_log_index_prefix}-${brandCode}`,
            body: {
                query,
                sort: [{ created_at: { order: 'asc' } }],
                size: 500,
            },
        });

        return result.body;
    }

    static async clearLogsForDeletedUser(userId: number, email: string, brandCode: BrandCode) {
        const index = `${Environment.apiKeys.elasticsearch_log_index_prefix}-${brandCode}`;
        await client.indices.refresh({ index });
        const logsByEmail = (
            await client.search<ElasticSearchResponse<ElasticLog>>({
                index,
                body: {
                    query: {
                        query_string: {
                            query: `message:${email}`,
                            default_operator: 'AND',
                        },
                    },
                },
            })
        ).body.hits.hits;
        if (logsByEmail.length > 0) {
            const updates: { update?: { _id: string }; script?: { source: string; lang: string; params: { userId: number } } }[] = [];
            logsByEmail.forEach(log => {
                updates.push({
                    update: {
                        _id: log._id,
                    },
                });
                updates.push({
                    script: {
                        source: 'ctx._source.user_id = params.userId;',
                        lang: 'painless',
                        params: { userId },
                    },
                });
            });

            await client.bulk({
                index,
                body: updates,
                refresh: true,
            });
        }

        const logs = (await this.logsForUser(userId, brandCode)).hits.hits;
        const idsToClean = logs
            .filter(log => {
                const label = log._source?.label;
                const message = log._source?.message;
                const body = log._source?.request_details?.request_body;
                return (
                    label?.includes('about') ||
                    label?.includes('firstName') ||
                    label?.includes('lastName') ||
                    label?.includes('email') ||
                    label?.includes('address') ||
                    message?.includes('email') ||
                    body?.includes('about') ||
                    body?.includes('firstName') ||
                    label?.includes('lastName') ||
                    body?.includes('email') ||
                    body?.includes('placeName') ||
                    body?.includes('streetName') ||
                    body?.includes('houseNumber')
                );
            })
            .map(log => {
                return log._id;
            });
        if (idsToClean.length > 0) {
            const updates: {
                update?: { _id: string };
                script?: {
                    source: string;
                    lang: string;
                    params: { replacement: string };
                };
            }[] = [];
            idsToClean.forEach(id => {
                updates.push({
                    update: {
                        _id: id,
                    },
                });
                updates.push({
                    script: {
                        source: 'ctx._source.message = params.replacement; ctx._source.request_details.request_body = params.replacement;',
                        lang: 'painless',
                        params: {
                            replacement: '--deleted--',
                        },
                    },
                });
            });

            await client.bulk({
                index,
                body: updates,
                refresh: true,
            });
        }
    }

    static deleteByUserId(userId: number, brandCode: BrandCode) {
        return client.deleteByQuery({
            index: `${Environment.apiKeys.elasticsearch_log_index_prefix}-${brandCode}`,
            type: '_doc',
            conflicts: 'proceed',
            body: {
                query: {
                    bool: {
                        must: [
                            {
                                term: {
                                    user_id: userId,
                                },
                            },
                        ],
                    },
                },
            },
        });
    }
}
