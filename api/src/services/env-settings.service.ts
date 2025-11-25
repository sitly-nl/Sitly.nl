import { readFileSync } from 'fs';
import { BrandCode } from '../models/brand-code';
import { Files } from './files.service';
import * as child from 'child_process';
import * as AWS from 'aws-sdk';
// import { getSSMOutput } from '../../scripts-src/load-ssm.script';
AWS.config.loadFromPath('aws-config.json');

export const apiTestsUserAgent = 'api-test-suite';

interface EnvironmentInterface {
    environment: EnvironmentName;
    use_localhost_database?: boolean;
    use_localhost_redis?: boolean;
}

interface ElasticSearchCloudAuth {
    cloud: {
        id: string;
    };
    auth: {
        username: string;
        password: string;
    };
}

interface Auth {
    name: string;
    pass: string;
}
interface ApiKeysInterface {
    adyen: {
        api: {
            key: string;
            key_live: string;
            username: string;
            password: string;
        };
        config: {
            checkout_api_url: string;
            checkout_api_url_live: string;
            classic_api_url: string;
            live: boolean;
        };
        notifications: {
            username: string;
            password: string;
        };
    };
    apple_shared_secret: string;
    auth: {
        blog: Auth;
        cdn: Auth;
        cms: Auth;
        website: Auth;
    };
    cdn_url: string;
    database_translations: {
        host: string;
        user: string;
        password: string;
    };
    database_host?: string;
    database: Record<BrandCode, { user: string; password: string }>;
    elasticsearch_users: ElasticSearchCloudAuth;
    elasticsearch_logs: ElasticSearchCloudAuth;
    elasticsearch_index_prefix: string;
    elasticsearch_log_index_prefix: string;
    facebook_auth: {
        clientId: string;
        clientSecret: string;
    };
    facebook_conversion_access_token: string;
    firebase: string;
    firebase_web: string;
    google_autoML_model_id: string;
    google_ga4: {
        api_secret: string;
        measurement_id: string;
    };
    google_maps: string;
    google_tag_manager_env: string;
    google_tag_manager_auth: string;
    google_vision: string;
    googleapis: {
        client_email: string;
        private_key: string;
    };
    googleapis_auth: {
        clientId: string;
        clientSecret: string;
        androidClientId: string;
        iOSClientId: string;
        redirect: string;
    };
    growthbook: {
        api_key: string;
        webhook_secret: string;
    };
    here_geocoding: string;
    instagram_app_id: number;
    instagram_client_secret: string;
    intercom_identity_key: string;
    jwt_secret: string;
    location_iq: string;
    loki_host: string;
    mapbox_access_token: string;
    redis_host: string;
    replyto_email_key: string;
    slack_bot_token: string;
    trustpilot_auth: {
        api_key: string;
        secret: string;
        username: string;
        password: string;
    };
    zero_bounce: string;
}

type EnvironmentName = 'prod' | 'test' | 'apitests';

export class Environment {
    static readonly settings = Files.environment as EnvironmentInterface;
    // static readonly settings = { environment: 'test' } as EnvironmentInterface;
    // static readonly settings = { environment: 'prod', use_localhost_redis: true } as EnvironmentInterface;

    static isTest = Environment.settings.environment === 'test';
    static isProd = Environment.settings.environment === 'prod';
    static isApiTests = Environment.settings.environment === 'apitests';
    static environmentName = Environment.settings.environment;
    static readonly apiKeys = {
        ...Environment.getOnePassApiKeys(),
        // ...Environment.getSSMKeys(),
        ...(process.env.EXTERNAL_ENV ? { redis_host: process.env.REDIS_HOST, database_host: process.env.DATABASE_HOST } : {}),
    };

    static jwtSecret = Buffer.from(Environment.apiKeys.jwt_secret, 'base64');
    static brands = Files.brands.filter(item => item.active);

    // TODO: This should become a Configuration setting
    static apiUrl() {
        if (Environment.isProd) {
            return 'https://api.sitly.com/v2';
        }

        return 'https://api.test.sitly.com/v2';
    }

    static host() {
        return new URL(Environment.apiUrl()).host;
    }

    static parseSsmParam(name: string, value: unknown): Partial<ApiKeysInterface> {
        const returnValue: Record<string, unknown> = {};

        if (name.includes('/')) {
            let obj = returnValue;

            const parts = name.split('/');

            let isLast = false;
            parts.forEach((part: string, index: number) => {
                isLast = index === parts.length - 1;
                obj[part] = isLast ? value : {};

                if (!isLast) {
                    obj = obj[part] as Record<string, unknown>;
                }
            });
        } else {
            returnValue[name] = value;
        }

        return returnValue;
    }

    // static getSSMKeys() {
    //     const deepMerge = (obj1: Record<string, unknown>, obj2: Record<string, unknown>) => {
    //         const result = { ...obj1 };
    //         for (const key of Object.keys(obj2)) {
    //             if (obj2[key] instanceof Object && obj1[key] instanceof Object) {
    //                 result[key] = deepMerge(obj1[key] as never, obj2[key] as never);
    //             } else {
    //                 result[key] = obj2[key];
    //             }
    //         }
    //         return result;
    //     };

    //     let ssmKeys: Partial<ApiKeysInterface> = {};
    //     const ssmEnvironmentName = this.isApiTests ? 'apitests' : (Environment.settings.environment as string);
    //     const path = `/api/${ssmEnvironmentName}`;
    //     let rawParams = getSSMOutput(ssmEnvironmentName);

    //     rawParams.Parameters?.forEach(parameter => {
    //         const paramName = parameter.Name?.replace(new RegExp(`^${path}/`), '');
    //         const paramValue = parameter.Value;

    //         const param = Environment.parseSsmParam(paramName, paramValue);

    //         ssmKeys = deepMerge(ssmKeys, param);
    //     });

    //     // SSM may return paginated results, in which case we need to continue to handle multiple pages using "nextToken"
    //     while (rawParams.NextToken !== undefined) {
    //         rawParams = getSSMOutput(ssmEnvironmentName, rawParams.NextToken);

    //         rawParams.Parameters?.forEach(parameter => {
    //             const paramName = parameter.Name?.replace(new RegExp(`^${path}/`), '');
    //             const paramValue = parameter.Value;

    //             const param = Environment.parseSsmParam(paramName, paramValue);

    //             ssmKeys = deepMerge(ssmKeys, param);
    //         });
    //     }

    //     return ssmKeys;
    // }

    static getOnePassApiKeys() {
        const onePass = JSON.parse(readFileSync('1password.json', 'utf8')) as { serverURL: string; token: string };
        const apiKeysIds = {
            test: '6sgxwrwuwbx7s2tgrcyh4pyniu',
            prod: 'w7shjezff33c2vzzkaa2rfizpi',
            apitests: 'mzovpnaam3c6dfcbzlrkqo3iba',
        };
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const apiKeysItem = JSON.parse(
            child.execSync(
                `curl -s --location --request GET ${onePass.serverURL}v1/vaults/mxipenaodmhttbaaoadhxubnpe/items/${
                    apiKeysIds[Environment.environmentName]
                } --header "Authorization: Bearer ${onePass.token}"`,
                { encoding: 'utf8' },
            ),
        );
        return JSON.parse(apiKeysItem.fields?.[0]?.value as string) as ApiKeysInterface;
    }
}
