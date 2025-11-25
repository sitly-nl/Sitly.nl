import { Request } from 'express';
import { config } from '../../config/config';
import { Environment } from './env-settings.service';
import { CustomData, EventRequest, ServerEvent, UserData } from 'facebook-nodejs-business-sdk';
import { User } from '../models/user/user.model';
import { DateUtil } from '../utils/date-util';
import { LogService } from './log.service';
import { Payment } from '../models/payment.model';
import { PaymentType } from '../models/payment-types';
import { request } from '../utils/util';

export class FacebookProfile {
    id: string;
    email?: string;
    first_name: string;
    last_name: string;
    avatarUrl?: string;
}

export class FacebookService {
    private version = 'v20.0';
    constructor(private token?: string) {}

    async getMe(fields = 'email,first_name,last_name,location,gender,sports,locale,birthday,picture.width(1300).height(1300)') {
        const res = await request({
            url: `https://graph.facebook.com/${this.version}/me`,
            qs: {
                fields,
                access_token: this.token,
            },
            json: true,
        });
        const result = res.body as {
            error: unknown;
            picture?: { data?: { url: string } };
        };
        if (result.error) {
            // eslint-disable-next-line @typescript-eslint/only-throw-error
            throw result.error;
        }

        const profile = new FacebookProfile();
        Object.assign(profile, result);
        profile.avatarUrl = result.picture?.data?.url;
        return profile;
    }

    async codeToToken(facebookLoginCode: string, redirectUrl: string) {
        const res = await request({
            method: 'POST',
            url: `https://graph.facebook.com/${this.version}/oauth/access_token`,
            form: {
                redirect_uri: redirectUrl,
                client_id: Environment.apiKeys.facebook_auth.clientId,
                client_secret: Environment.apiKeys.facebook_auth.clientSecret,
                code: facebookLoginCode,
            },
            json: true,
        });
        const result = res.body as {
            error: unknown;
            access_token?: string;
        };
        if (result.error) {
            // eslint-disable-next-line @typescript-eslint/only-throw-error
            throw result.error;
        }
        return result.access_token;
    }

    private async fireFacebookServerEvent(
        eventId: string,
        eventName: string,
        req: Request,
        user: User,
        paymentData?: { value: number; currency: string },
    ) {
        try {
            const accessToken = Environment.apiKeys.facebook_conversion_access_token;
            if (accessToken) {
                const brandConfigSettings = config.getConfig(req.brandCode);
                const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket.remoteAddress;
                const userAgent = req.headers?.['user-agent'];
                const referer = req.headers.referer || brandConfigSettings.url;
                const pixelId = brandConfigSettings.facebookPixelId;

                const userUrl = user.customUser.webuser_url;
                const { value, currency } = paymentData ?? {};
                const eventIdWithUserId = `${eventId}.${req.brandCode}.${userUrl}`;

                const userData = new UserData()
                    .setEmail(user.email ?? '')
                    .setClientIpAddress(ip)
                    .setClientUserAgent(userAgent ?? '')
                    .setExternalId(user.customUser.webuser_url)
                    .setFirstName(user.first_name ?? '')
                    .setLastName(user.last_name ?? '');

                const serverEvent = new ServerEvent()
                    .setEventName(`${eventName}-${user.roleName}`)
                    .setEventTime(DateUtil.dateToTimestamp(new Date()))
                    .setEventId(eventIdWithUserId)
                    .setUserData(userData)
                    .setEventSourceUrl(referer)
                    .setActionSource('website');

                if (value && currency) {
                    const customData = new CustomData().setValue(value).setCurrency(currency);
                    serverEvent.setCustomData(customData);
                }

                const countryResponse = await new EventRequest(accessToken, `${pixelId}`).setEvents([serverEvent]).execute();
                return countryResponse;
            }
        } catch {
            LogService.logRequest({ req, user, label: `${eventId}.error.facebookPixel.${eventName}`, message: '' });
        }
    }

    async trackRegistration(req: Request, user: User) {
        return this.fireFacebookServerEvent('signup', 'CompleteRegistration', req, user);
    }

    async trackPremiumPurchase(req: Request, user: User, payment: Payment) {
        if (payment.order_type !== PaymentType.initial) {
            return;
        }
        const brandConfigSettings = config.getConfig(req.brandCode);
        return this.fireFacebookServerEvent('premium', 'PremiumPurchase', req, user, {
            value: payment.amount,
            currency: brandConfigSettings.currencyCode,
        });
    }
}
