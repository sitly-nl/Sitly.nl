import { AuthSubRouteType } from 'modules/auth/auth-route-type';

export enum RouteType {
    auth = 'auth',
    settings = 'settings',
    messages = 'messages',
    chat = 'chat',
    search = 'search',
    favorites = 'favorites',
    invites = 'invites',
    account = 'account',
    users = 'users',
    instagram = 'instagram',
    facebookPhotos = 'facebook-photos',
    instagramPhotos = 'instagram-photos',
    addressChange = 'address-change',
    hidden = 'hidden',
    recommendations = 'recommendations',
    instantJob = 'instant-job',
    complete = 'complete',
    postRecommendation = 'post-recommendation',
    resetPassword = 'reset-password',

    premiumStart = 'premium/premium-start',
    premiumPaymentMethods = 'premium/payment-methods',

    notFound = '404',
    empty = '/',
}

export const allRouteTypes = Object.values(RouteType);
export const noAuthRouteTypes = [
    RouteType.auth,
    `${RouteType.auth}/${AuthSubRouteType.signIn}`,
    `${RouteType.auth}/${AuthSubRouteType.signUp}`,
    `${RouteType.auth}/${AuthSubRouteType.forgotPassword}`,
    RouteType.resetPassword,
    RouteType.postRecommendation,
];
