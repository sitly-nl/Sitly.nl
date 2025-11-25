import { addDays, isAfter } from 'date-fns';
import { optionalAwait, request, Util } from '../utils/util';
import { config } from '../../config/config';
import { Environment } from './env-settings.service';
import { SentryService } from './sentry.service';
import { BrandCode } from '../models/brand-code';
import { User } from '../models/user/user.model';
import { EmailType } from './email/email.service';
import { Subscription } from '../models/subscription.model';

export type GA4UserPremiumState = 'first_premium' | 'cancelled_premium' | 'restored_premium';
export type GA4EventName =
    | 'user_premium_state_change'
    | 'registration_premium_cancelled'
    | 'registration_premium_restored'
    | 'sent_email'
    | 'sent-notification';
export type GA4SitlyPlatform = 'api_tests' | 'api' | 'email';
export type GA4DebugMode = 1 | 0;
export interface GA4EventParams {
    element_category?: 'email' | 'invites';
    element_type?: EmailType | 'push';
    element_description?: string;
}
export interface GA4CollectParams {
    client_id?: `${string}.${string}`;
    user_id?: string;
    user_properties?: {
        user_premium_state: {
            value: GA4UserPremiumState;
        };
    };
    events: {
        name: GA4EventName;
        params: {
            sitly_platform: GA4SitlyPlatform;
            debug_mode: GA4DebugMode;
            user_premium_state?: GA4UserPremiumState;
        } & GA4EventParams;
    }[];
}

export class TrackingService {
    static async trackPayment(user: User, subscription: Subscription, orderId: number) {
        const globalParams = {
            ...TrackingService.paramsForUser(user),
            ti: orderId,
        };

        const amount = subscription.amount;
        const transactionParams = {
            ...globalParams,
            t: 'transaction',
            ta: 'Oudermatch',
            tr: amount,
        };
        const itemParams = {
            ...globalParams,
            t: 'item',
            in: `${subscription.duration}M-${subscription.price_per_unit}E`,
            ip: amount,
            iq: 1,
            ic: `Premium ${subscription.instance_id}`,
            iv: `Premium ${user.roleName} Recurring`,
        };

        return Promise.all([transactionParams, itemParams].map(params => TrackingService.sendRequest(params)));
    }

    private static paramsForUser(user: User) {
        return {
            v: 1,
            tid: config.getConfig(user.brandCode).googleAnalyticsCode,
            ds: 'api',
            z: Util.rand(123456789, 987654321),
            uid: user.customUser.webuser_url,
            uip: user.customUser.ip,
            ni: '1',
        };
    }

    private static sendRequest(params: Record<string, unknown>) {
        return request({
            url: 'https://www.google-analytics.com/collect',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.8.1.13) Gecko/20080311 Firefox/2.0.0.13',
            },
            qs: params,
        });
    }

    private static async sendTrackingRequestGA4(webUserUrl: string, clientId: string, params: GA4CollectParams, brandCode: BrandCode) {
        try {
            await request({
                url: 'https://www.google-analytics.com/mp/collect',
                method: 'POST',
                qs: {
                    measurement_id: Environment.apiKeys.google_ga4.measurement_id,
                    api_secret: Environment.apiKeys.google_ga4.api_secret,
                },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.8.1.13) Gecko/20080311 Firefox/2.0.0.13',
                },
                json: {
                    client_id: clientId,
                    user_id: `${brandCode}.${webUserUrl}`,
                    ...params,
                },
            });
        } catch (error) {
            SentryService.captureException(error, 'tracking', brandCode);
        }
    }

    static async trackUserPremiumStatusChange(user: User, previousPremium: string | Date | null, canceled = false) {
        await optionalAwait(user.sequelize.models.UserActivity.insertActivity(user));

        // if the user current premium date is after 7 days from now, we probably already recorded this event
        const premiumRestoredThreshold = addDays(new Date(), 7);
        if (!canceled && previousPremium && isAfter(new Date(previousPremium), premiumRestoredThreshold)) {
            return;
        }

        await user.customUser.loadRelationIfEmpty('externalServices');
        const gaClientId = user.customUser.externalServices?.ga_client_id;
        if (!gaClientId) {
            return;
        }

        const [userPremiumState, eventName]: [GA4UserPremiumState, GA4EventName] = canceled
            ? ['cancelled_premium', 'registration_premium_cancelled']
            : previousPremium
              ? ['restored_premium', 'registration_premium_restored']
              : ['first_premium', 'user_premium_state_change'];

        const webuserUrl = user.customUser.webuser_url;

        const trackParams: GA4CollectParams = {
            user_properties: {
                user_premium_state: { value: userPremiumState },
            },
            events: [
                {
                    name: eventName,
                    params: {
                        user_premium_state: userPremiumState,
                        sitly_platform: Environment.isApiTests ? 'api_tests' : 'api',
                        debug_mode: Environment.isProd ? 0 : 1,
                    },
                },
            ],
        };

        if (Environment.isApiTests) {
            return { webuserUrl, gaClientId, trackParams };
        }

        await this.sendTrackingRequestGA4(webuserUrl, gaClientId, trackParams, user.brandCode);
    }

    static async trackEmailSent(user: User, type: EmailType) {
        await user.customUser.loadRelationIfEmpty('externalServices');
        const gaClientId = user.customUser.externalServices?.ga_client_id;
        if (!gaClientId) {
            return;
        }

        const webuserUrl = user.customUser.webuser_url;
        const trackParams: GA4CollectParams = {
            events: [
                {
                    name: 'sent_email',
                    params: {
                        sitly_platform: 'email',
                        debug_mode: Environment.isProd ? 0 : 1,
                        element_category: 'email',
                        element_type: type,
                    },
                },
            ],
        };

        if (Environment.isApiTests) {
            return { webuserUrl, gaClientId, trackParams };
        } else {
            await this.sendTrackingRequestGA4(webuserUrl, gaClientId, trackParams, user.brandCode);
        }
    }

    static async trackPushNotification(
        user: User,
        pushType: 'invites_onboarding' | 'unused_invites_weekly' | 'new_received_invites_onboarding' | 'new_received_invites_main',
    ) {
        await user.customUser.loadRelationIfEmpty('externalServices');
        const gaClientId = user.customUser.externalServices?.ga_client_id;
        if (!gaClientId) {
            return;
        }

        const webuserUrl = user.customUser.webuser_url;
        const trackParams: GA4CollectParams = {
            events: [
                {
                    name: 'sent-notification',
                    params: {
                        sitly_platform: 'api',
                        debug_mode: Environment.isProd ? 0 : 1,
                        element_category: 'invites',
                        element_type: 'push',
                        element_description: pushType,
                    },
                },
            ],
        };

        if (Environment.isApiTests) {
            return { webuserUrl, gaClientId, trackParams };
        } else {
            await this.sendTrackingRequestGA4(webuserUrl, gaClientId, trackParams, user.brandCode);
        }
    }
}
