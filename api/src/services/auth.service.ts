import { Request, Response, NextFunction } from 'express';
import * as auth from 'basic-auth';
import { GemUserTokenData, SitlyToken, SitlyTokenType, SitlyUserTokenData, TokenObject } from '../sitly-token';
import { BrandCode } from '../models/brand-code';
import { optionalAwait } from '../utils/util';
import { GemUserRole } from '../models/gem/gem-user.model';
import { BasicAuthResult } from 'basic-auth';
import { forbiddenError, unauthorized } from './errors';
import { Environment } from './env-settings.service';
import { getMainModels, getModels } from '../sequelize-connections';
import { User } from '../models/user/user.model';
import { RequestType } from '../../definitions.base';
import { add, isBefore, isToday, sub } from 'date-fns';
import { CustomUserColumns } from '../models/user/custom-user.model';

export interface UserRequest extends Request {
    user: User;
}
export interface OptionalUserRequest extends Request {
    user: User | undefined;
}

export class AuthService {
    private static userPathsMatcher = [
        { url: /^\/v2\/[a-z]{2,4}\/conversations(\/$|$|\?)/, methods: ['GET'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/conversations\/autorejection/, methods: ['POST'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/conversations\/[a-z0-9]+$/, methods: ['DELETE'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/conversations\/[a-z0-9]+\/messages/, methods: ['GET', 'POST'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/conversations\/[a-z0-9]+\/messages\/[a-z0-9]+$/, methods: ['DELETE'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/country-settings/, methods: ['GET'], type: 'userOptional' as const },
        { url: /^\/v2\/[a-z]{2,4}\/feedbacks/, methods: ['GET'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/feedbacks$/, methods: ['POST'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/job-postings$/, methods: ['POST'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/job-postings\/[a-z0-9]+\/available$/, methods: ['POST'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/job-postings\/[a-z0-9]+\/reject\/[a-z0-9]+/, methods: ['POST'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/job-postings\/[a-z0-9]+\/remove-invitation\/[a-z0-9]+$/, methods: ['POST'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/job-postings\/invitations$/, methods: ['POST'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/payments\/sessions$/, methods: ['POST'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/recommendations$/, methods: ['POST'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2}\/recommendations\/[A-Za-z0-9\-_]+(\?.*)?$/, methods: ['GET'], type: 'userOptional' as const },
        { url: /^\/v2\/[a-z]{2,4}\/recommendations\/[a-z0-9]+\/requests$/, methods: ['POST'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/recommendations\/[A-Za-z0-9\-_]+$/, methods: ['PATCH'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/reports$/, methods: ['POST'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/scripts$/, methods: ['GET'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/latest-registrations$/, methods: ['GET'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me$/, methods: ['DELETE'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me(\/$|$|\?)/, methods: ['PATCH'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/about-suggestion$/, methods: ['GET'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/children/, methods: ['GET', 'POST'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/children\/[a-z0-9]+$/, methods: ['PATCH', 'DELETE'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/connection-invites/, methods: ['GET'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/connection-invites\/[0-9]+$/, methods: ['PATCH'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/devices$/, methods: ['POST'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/devices\//, methods: ['PATCH', 'DELETE'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/discount$/, methods: ['POST'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/exclusions$/, methods: ['POST'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/exclusions\/[a-z0-9]+$/, methods: ['DELETE'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/exclusions\/hidden$/, methods: ['GET'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/favorites/, methods: ['GET'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/favorites$/, methods: ['POST'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/favorites\/[a-z0-9]+$/, methods: ['DELETE'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/hourly-rates-statistic$/, methods: ['GET'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/non-response-victim-html$/, methods: ['GET'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/notification-preferences$/, methods: ['GET', 'PATCH'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/payments$/, methods: ['GET', 'POST'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/payments\/[a-z0-9]+$/, methods: ['PATCH'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/payments\/[a-z0-9]+\/invoice$/, methods: ['GET'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/payments\/free-extension$/, methods: ['POST'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/payments\/resume$/, methods: ['POST'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/photos\/[a-z0-9]+$/, methods: ['DELETE'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/recommendations\/email$/, methods: ['POST'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/recommendations\/links$/, methods: ['POST'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/recommendations\/suggested-users(\/$|$|\?)/, methods: ['GET'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/references$/, methods: ['POST'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/references\/[a-z0-9]+$/, methods: ['PATCH', 'DELETE'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/updates/, methods: ['GET'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/validate-voucher$/, methods: ['POST'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/[a-z0-9]+(\/$|$|\?)/, methods: ['GET'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/[a-z0-9]+\/connection-invites$/, methods: ['POST'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/[a-z0-9]+\/custom-log$/, methods: ['POST'], type: 'userOptional' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/[a-z0-9]+\/photos$/, methods: ['GET', 'POST'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\/[a-z0-9]+\/references$/, methods: ['GET'], type: 'user' as const },
        { url: /^\/v2\/[a-z]{2,4}\/users\?.*$/, methods: ['GET'], type: 'userOptional' as const },
    ];

    private static allowedGemPathsWithoutToken = [{ url: /^\/v2\/[a-z]{2,4}\/gem\/tokens$/, methods: ['POST'] }];

    private static allowedPathsWithoutToken = [
        ...AuthService.allowedGemPathsWithoutToken,
        { url: /^\/v2\/[a-z]{2,4}\/.*/, methods: ['OPTIONS'] },
        { url: /^\/v2\/[a-z]{2,4}\/tokens$/, methods: ['POST'] },
        { url: /^\/v2\/[a-z]{2,4}\/tokens\?include=[a-z.\-,(%2C)]+$/, methods: ['POST'] },
        { url: /^\/v2\/[a-z]{2,4}\/users$/, methods: ['POST'] },
        { url: /^\/v2\/[a-z]{2,4}\/users\?validate=(all|values)$/, methods: ['POST'] },
        { url: /^\/v2\/[a-z]{2,4}\/users\/[a-zA-Z0-9]+\/recommendations$/, methods: ['POST'] },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/discount$/, methods: ['POST'] },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/payments\/[0-9]+\?.*redirectResult.*$/, methods: ['GET'] },
        { url: /^\/v2\/[a-z]{2,4}\/users\/password(\?include=[a-z.\-,(%2C)]+)?$/, methods: ['POST'] },
        { url: /^\/v2\/[a-z]{2,4}\/users\/testAvatarValidation(\?include=[a-z.\-,]+)?$/, methods: ['POST'] },
        { url: /^\/v2\/[a-z]{2,4}\/users\/city-statistics/, methods: ['GET'] },
        { url: /^\/v2\/[a-z]{2,4}\/users\?.*meta-only=1.*$/, methods: ['GET'] },
        { url: /^\/v2\/[a-z]{2,4}\/cms\/deeplink-urls(\?deviceType=[a-zA-Z0-9]+)?$/, methods: ['GET'] },
        { url: /^\/v2\/[a-z]{2,4}\/country-settings/, methods: ['GET'] },
        { url: /^\/v2\/[a-z]{2,4}\/job-postings\/invitations$/, methods: ['POST'] },
        { url: /^\/v2\/[a-z]{2,4}\/cms\/ratings/, methods: ['GET'] },
        { url: /^\/v2\/[a-z]{2,4}\/elastic-search\/check/, methods: ['GET'] },
        { url: /^\/v2\/[a-z]{2,4}\/features(\?projectId=[a-zA-Z0-9_-]+)?$/, methods: ['GET'] },
        { url: /^\/v2\/[a-z]{2,4}\/features\/recache(\?projectId=[a-zA-Z0-9_-]+)?$/, methods: ['POST'] },
        { url: /^\/v2\/[a-z]{2}\/recommendations\/[A-Za-z0-9\-_]+(\?.*)?$/, methods: ['GET'] },
        { url: /^\/v2\/[a-z]{2,4}\/redirections/, methods: ['GET'] },
        { url: /^\/v2\/main\/apple-app-site-association$/, methods: ['GET'] },
        { url: /^\/v2\/main\/countries$/, methods: ['GET'] },
        { url: /^\/v2\/main\/deeplinks(\?deviceType=[a-zA-Z0-9]+)?$/, methods: ['GET'] },
        { url: /^\/v2\/main\/email-events$/, methods: ['POST'] },
        { url: /^\/v2\/main\/payments$/, methods: ['POST'] },
        { url: /^\/v2\/main\/tokens\/countries/, methods: ['GET'] },
        { url: /^\/v2\/main\/translations\/[a-zA-Z-.]+$/, methods: ['GET'] },
        { url: /^\/v2\/main\/users\/password-reset-token$/, methods: ['POST'] },
        { url: /^\/v2\/main\/policies\/(terms|cookie|privacy)$/, methods: ['GET'] },
    ];

    private static allowedPathsWithoutCompletion = [
        { url: /^\/v2\/[a-z]{2,4}\/users\/me(\?include=[a-z.\-,(%2C)]+)?(&next-question=.*)?$/, methods: ['PATCH', 'GET'] },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/custom-log?$/, methods: ['POST'] },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\?validate=values$/, methods: ['PATCH'] },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/about-suggestion$/, methods: ['GET'] },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/hourly-rates-statistic$/, methods: ['GET'] },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/photos(\/[0-9]+)?$/, methods: ['POST', 'GET', 'DELETE'] },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me\/children(\/[0-9]+)?$/, methods: ['POST', 'GET', 'DELETE', 'PATCH'] },
        { url: /^\/v2\/[a-z]{2,4}\/users\/me$/, methods: ['DELETE'] },
        { url: /^\/v2\/[a-z]{2,4}\/address-components/, methods: ['GET'] },
        { url: /^\/v2\/[a-z]{2,4}\/instagram-tokens/, methods: ['POST'] },
        { url: /^\/v2\/[a-z]{2,4}\/feedbacks$/, methods: ['POST'] },
    ];

    private static systemUserOnlyPaths = [
        { url: /^\/v2\/[a-z]{2,4}\/cms\/.*$/, methods: ['GET'] },
        { url: /^\/v2\/[a-z]{2,4}\/users\/[a-z0-9]+\/location$/, methods: ['POST'] },
        { url: /^\/v2\/[a-z]{2,4}\/users\/[a-z0-9]+\/recommendations$/, methods: ['POST'] },
        { url: /^\/v2\/[a-z]{2,4}\/users\/[a-z0-9]+\/custom-log?$/, methods: ['POST'] },
        { url: /^\/v2\/main\/maintenance\/wakeup-automl$/, methods: ['POST'] },
        { url: /^\/v2\/main\/cache\/reset$/, methods: ['POST'] },
        { url: /^\/v2\/[a-z]{2,4}\/elastic-search\/users\/sync$/, methods: ['POST'] },
        { url: /^\/v2\/[a-z]{2,4}\/conversations\/[a-z0-9]+\/notifications$/, methods: ['POST'] },
        { url: /^\/v2\/[a-z]{2,4}\/locales$/, methods: ['GET'] },
        { url: /^\/v2\/[a-z]{2,4}\/welfare\/companies$/, methods: ['GET', 'POST'] },
        { url: /^\/v2\/[a-z]{2,4}\/welfare\/companies\/[a-z0-9]+\/vouchers$/, methods: ['POST'] },
        { url: /^\/v2\/[a-z]{2,4}\/welfare\/companies\/[a-z0-9]+\/billing-amount$/, methods: ['GET'] },
        { url: /^\/v2\/[a-z]{2,4}\/statistics\/users\/country$/, methods: ['GET'] },
    ];

    private static allowedPathsWithWebsiteServerUser = [
        { url: /^\/v2\/[a-z]{2,4}\/cms\/.*$/, methods: ['GET'] },
        { url: /^\/v2\/[a-z]{2,4}\/users\?.*$/, methods: ['GET'] },
        { url: /^\/v2\/[a-z]{2,4}\/users\/[a-z0-9]+($|\?.*$)/, methods: ['GET'] },
        { url: /^\/v2\/[a-z]{2,4}\/users\/password-reset-token(\?validate|\?include=user)?$/, methods: ['POST'] },
        { url: /^\/v2\/[a-z]{2,4}\/statistics\/users\/country$/, methods: ['GET'] },
    ];

    private static allowedPathsWithSystemUser = [
        ...AuthService.systemUserOnlyPaths,
        { url: /^\/v2\/[a-z]{2,4}\/users\?.*$/, methods: ['GET'] },
        { url: /^\/v2\/[a-z]{2,4}\/users\/[a-z0-9]+($|\?.*$)/, methods: ['GET'] },
        { url: /^\/v2\/[a-z]{2,4}\/users\/password-reset-token(\?validate|\?include=user)?$/, methods: ['POST'] },
        { url: /^\/v2\/[a-z]{2,4}\/users\/password(\?include=user)?$/, methods: ['POST'] },
        { url: /^\/v2\/[a-z]{2,4}\/address-components/, methods: ['GET'] },
    ];

    private static allowedPathsWithBlogUser = [
        { url: /^\/v2\/[a-z]{2,4}\/address-components\/places/, methods: ['GET'] },
        { url: /^\/v2\/[a-z]{2,4}\/users\/city-statistics/, methods: ['GET'] },
    ];

    private static mainRoles = [GemUserRole.admin, GemUserRole.tester, GemUserRole.support];
    private static allowedPathsWithGemUser = [
        { url: /^\/v2\/[a-z]{2,4}\/gem\/gem-users$/, methods: ['GET'], roles: [GemUserRole.admin] },
        { url: /^\/v2\/[a-z]{2,4}\/gem\/gem-users\/([0-9]+)$/, methods: ['GET'], roles: [GemUserRole.admin] },
        {
            url: /^\/v2\/[a-z]{2,4}\/gem\/gem-users\/me$/,
            methods: ['GET'],
            roles: [...AuthService.mainRoles, GemUserRole.translator, GemUserRole.customerResearcher],
        },
        { url: /^\/v2\/[a-z]{2,4}\/gem\/gem-users$/, methods: ['POST'], roles: [GemUserRole.admin] },
        { url: /^\/v2\/[a-z]{2,4}\/gem\/gem-users\/[0-9]+$/, methods: ['DELETE'], roles: [GemUserRole.admin] },
        { url: /^\/v2\/[a-z]{2,4}\/gem\/gem-users\/(me|[0-9]+)$/, methods: ['PATCH'], roles: [GemUserRole.admin] },
        { url: /^\/v2\/[a-z]{2,4}\/gem\/gem-users\/(me|[0-9]+)\/2fa-secret$/, methods: ['POST'], roles: [GemUserRole.admin] },

        { url: /^\/v2\/[a-z]{2,4}\/gem\/sitly-users\?.*$/, methods: ['GET'], roles: AuthService.mainRoles },
        { url: /^\/v2\/[a-z]{2,4}\/gem\/sitly-users\/warned$/, methods: ['GET', 'POST'], roles: AuthService.mainRoles },
        { url: /^\/v2\/[a-z]{2,4}\/gem\/sitly-users\/warned\?meta-only/, methods: ['GET'], roles: AuthService.mainRoles },
        { url: /^\/v2\/[a-z]{2,4}\/gem\/sitly-users\/warned\/[a-z]+/, methods: ['GET'], roles: AuthService.mainRoles },
        { url: /^\/v2\/[a-z]{2,4}\/gem\/sitly-users\/flagged-personal-data.*$/, methods: ['GET', 'POST'], roles: AuthService.mainRoles },
        {
            url: /^\/v2\/[a-z]{2,4}\/gem\/sitly-users\/[0-9]+\/conversations\/[0-9]+\/messages$/,
            methods: ['GET'],
            roles: AuthService.mainRoles,
        },
        { url: /^\/v2\/[a-z]{2,4}\/gem\/sitly-users\/[0-9]+\/conversations$/, methods: ['GET'], roles: AuthService.mainRoles },
        { url: /^\/v2\/[a-z]{2,4}\/gem\/sitly-users$/, methods: ['POST'], roles: [GemUserRole.admin, GemUserRole.tester] },
        { url: /^\/v2\/[a-z]{2,4}\/gem\/sitly-users\/[0-9]+$/, methods: ['GET', 'PATCH', 'DELETE'], roles: AuthService.mainRoles },
        { url: /^\/v2\/[a-z]{2,4}\/gem\/sitly-users\/[0-9]+\/logs$/, methods: ['GET'], roles: AuthService.mainRoles },
        { url: /^\/v2\/[a-z]{2,4}\/gem\/sitly-users\/[0-9]+\/matches\?.*$/, methods: ['GET'], roles: [GemUserRole.admin] },
        { url: /^\/v2\/[a-z]{2,4}\/gem\/sitly-users\/[0-9]+\/recommendations\/[0-9]+/, methods: ['DELETE'], roles: AuthService.mainRoles },
        { url: /^\/v2\/[a-z]{2,4}\/gem\/sitly-users\/[0-9]+\/notes$/, methods: ['POST'], roles: AuthService.mainRoles },
        { url: /^\/v2\/[a-z]{2,4}\/gem\/sitly-users\/[0-9]+\/temp-tokens$/, methods: ['POST'], roles: AuthService.mainRoles },
        { url: /^\/v2\/[a-z]{2,4}\/gem\/sitly-users\/[0-9]+\/warning-email$/, methods: ['POST'], roles: AuthService.mainRoles },
        { url: /^\/v2\/[a-z]{2,4}\/gem\/sitly-users\/[0-9]+\/email$/, methods: ['POST'], roles: [GemUserRole.admin] },
        { url: /^\/v2\/[a-z]{2,4}\/gem\/sitly-users\/[0-9]+\/photos\/[0-9]+/, methods: ['DELETE'], roles: AuthService.mainRoles },

        { url: /^\/v2\/[a-z]{2,4}\/gem\/sensitive-phrases(\?.*)?$/, methods: ['GET'], roles: AuthService.mainRoles },
        { url: /^\/v2\/[a-z]{2,4}\/gem\/sensitive-phrases$/, methods: ['POST'], roles: AuthService.mainRoles },
        { url: /^\/v2\/[a-z]{2,4}\/gem\/sensitive-phrases\/[0-9]+$/, methods: ['PATCH'], roles: AuthService.mainRoles },
        { url: /^\/v2\/[a-z]{2,4}\/gem\/sensitive-phrase-exclusions(\?.*)?$/, methods: ['GET'], roles: AuthService.mainRoles },
        { url: /^\/v2\/[a-z]{2,4}\/gem\/sensitive-phrase-exclusions$/, methods: ['POST'], roles: AuthService.mainRoles },
        { url: /^\/v2\/[a-z]{2,4}\/gem\/sensitive-phrase-exclusions\/[0-9]+$/, methods: ['PATCH'], roles: AuthService.mainRoles },

        {
            url: /^\/v2\/main\/gem\/translation-groups$/,
            methods: ['GET'],
            roles: [GemUserRole.admin, GemUserRole.tester, GemUserRole.translator],
        },
        {
            url: /^\/v2\/main\/gem\/translation-groups$/,
            methods: ['POST'],
            roles: [GemUserRole.admin],
        },
        {
            url: /^\/v2\/main\/gem\/translations(\?.*)?$/,
            methods: ['GET'],
            roles: [GemUserRole.admin, GemUserRole.tester, GemUserRole.translator],
        },
        {
            url: /^\/v2\/main\/gem\/translations\/diff(\?.*)?$/,
            methods: ['GET'],
            roles: [GemUserRole.admin, GemUserRole.tester, GemUserRole.translator],
        },
        {
            url: /^\/v2\/main\/gem\/translations$/,
            methods: ['POST'],
            roles: [GemUserRole.admin],
        },
        {
            url: /^\/v2\/main\/gem\/translations\/exceptions\/[0-9]+$/,
            methods: ['POST'],
            roles: [GemUserRole.admin, GemUserRole.tester, GemUserRole.translator],
        },
        {
            url: /^\/v2\/main\/gem\/translations\/environments$/,
            methods: ['POST'],
            roles: [GemUserRole.admin],
        },
        {
            url: /^\/v2\/main\/gem\/translations\/[0-9]+$/,
            methods: ['PATCH'],
            roles: [GemUserRole.admin, GemUserRole.tester, GemUserRole.translator],
        },
        {
            url: /^\/v2\/main\/gem\/translations\/[0-9]+$/,
            methods: ['DELETE'],
            roles: [GemUserRole.admin],
        },

        { url: /^\/v2\/[a-z]{2,4}\/gem\/feedbacks(\?.*)?$/, methods: ['GET'], roles: [GemUserRole.admin, GemUserRole.customerResearcher] },
        { url: /^\/v2\/[a-z]{2,4}\/welfare\/companies\/[a-z0-9]+\/vouchers$/, methods: ['POST'], roles: AuthService.mainRoles },
        { url: /^\/v2\/main\/cache\/reset$/, methods: ['POST'], roles: [GemUserRole.admin] },

        { url: /^\/v2\/[a-z]{2,4}\/gem\/subscriptions(\?.*)?$/, methods: ['GET'], roles: [GemUserRole.admin] },
        { url: /^\/v2\/[a-z]{2,4}\/gem\/subscriptions$/, methods: ['POST'], roles: [GemUserRole.admin] },
        { url: /^\/v2\/[a-z]{2,4}\/gem\/subscriptions\/[0-9]+$/, methods: ['PATCH', 'POST', 'DELETE'], roles: [GemUserRole.admin] },

        {
            url: /^\/v2\/[a-z]{2,4}\/gem\/locales$/,
            methods: ['GET'],
            roles: [...AuthService.mainRoles, GemUserRole.translator, GemUserRole.customerResearcher],
        },
    ];

    private static async loginWithJwt(req: Request, jwt: string) {
        const token = new SitlyToken().read(jwt);
        if ((token?.data as SitlyUserTokenData)?.userId) {
            let user: User | undefined;
            try {
                user = await AuthService.userAllowedWithJwt(req, token as TokenObject<SitlyUserTokenData>, SitlyTokenType.access);
                if (req.requestType === 'user' || req.requestType === 'userOptional') {
                    (req as OptionalUserRequest).user = user;
                }
            } catch (e) {
                console.trace(e);
            }

            if (user) {
                const now = new Date();
                const originalLastLogin = user.last_login;
                const customUserSaveData: Partial<CustomUserColumns> = {};

                if (
                    !user.customUser.session_start_time ||
                    (originalLastLogin && isBefore(add(originalLastLogin, { hours: 1 }), new Date()))
                ) {
                    customUserSaveData.session_start_time = now;
                }

                user.last_login = now;
                if (!originalLastLogin || isBefore(originalLastLogin, sub(new Date(), { minutes: 5 }))) {
                    await user.save();
                }

                if (originalLastLogin && isBefore(originalLastLogin, sub(new Date(), { days: 30 }))) {
                    customUserSaveData.notes = `${user.customUser.notes ?? ''} [reactivation]`;
                }

                const timezone = req.headers['x-timezone'] as string;
                if (timezone && timezone !== user.customUser.timezone) {
                    customUserSaveData.timezone = timezone;
                }

                if (Object.keys(customUserSaveData).length > 0) {
                    await user.customUser.update(customUserSaveData);
                }

                if (!originalLastLogin || !isToday(originalLastLogin)) {
                    await optionalAwait(user.sequelize.models.UserActivity.insertActivity(user));
                }
            }
            return user;
        } else if ((token?.data as GemUserTokenData)?.gemUserId) {
            try {
                const gemUser = await AuthService.userAllowedWithGemUserJwt(token as TokenObject<GemUserTokenData>);
                req.gemUser = gemUser ?? undefined;
            } catch (e) {
                console.trace(e);
            }
        }
    }

    private static loginWithBasicAuth(req: Request, authUser: BasicAuthResult) {
        const cmsAllowed = authUser.name === Environment.apiKeys.auth.cms.name && authUser.pass === Environment.apiKeys.auth.cms.pass;
        const blogAllowed = authUser.name === Environment.apiKeys.auth.blog.name && authUser.pass === Environment.apiKeys.auth.blog.pass;
        const websiteServerAllowed =
            authUser.name === Environment.apiKeys.auth.website.name && authUser.pass === Environment.apiKeys.auth.website.pass;

        req.cmsAuthenticated = cmsAllowed;
        req.blogAuthenticated = blogAllowed;
        req.websiteServerAuthenticated = websiteServerAllowed;
    }

    private static handleBasicAuth(req: Request, res: Response, next: NextFunction) {
        if (req.cmsAuthenticated) {
            if (!AuthService.matchesPath(req, AuthService.allowedPathsWithSystemUser)) {
                console.log('invalid gem credentials or path not allowed');
                unauthorized({ res });
            } else {
                next();
            }
            // allowed for gem user with basic auth
        } else if (req.blogAuthenticated) {
            if (!AuthService.matchesPath(req, AuthService.allowedPathsWithBlogUser)) {
                console.log('invalid blog credentials or path not allowed');
                unauthorized({ res });
            } else {
                next();
            }
        } else if (req.websiteServerAuthenticated) {
            if (!AuthService.matchesPath(req, AuthService.allowedPathsWithWebsiteServerUser)) {
                console.log('invalid website server credentials or path not allowed');
                unauthorized({ res });
            } else {
                next();
            }
        } else {
            console.log('invalid auth credentials or path not allowed');
            unauthorized({ res });
        }
    }

    static async handleAuth(req: Request, res: Response, next: NextFunction) {
        AuthService.matchesPath(req, AuthService.userPathsMatcher);

        const basicAuthUser = auth(req);
        if (basicAuthUser) {
            AuthService.loginWithBasicAuth(req, basicAuthUser);
        }

        const jwt = AuthService.getJwtFromHeader(req);
        let user: User | undefined;
        if (jwt) {
            user = await AuthService.loginWithJwt(req, jwt);
        }

        if (AuthService.matchesPath(req, AuthService.allowedPathsWithoutToken)) {
            // no token needed for request
            next();
        } else if (basicAuthUser) {
            AuthService.handleBasicAuth(req, res, next);
        } else if (jwt) {
            const gemUser = req.gemUser;
            if (user) {
                if (user.customUser.completed !== 1) {
                    if (!AuthService.matchesPath(req, AuthService.allowedPathsWithoutCompletion)) {
                        forbiddenError({ res, code: 'METHOD_NOT_ALLOWED', title: 'This call is not allowed for incomplete users' });
                    } else {
                        next();
                    }
                } else if (AuthService.matchesPath(req, [...AuthService.systemUserOnlyPaths, ...AuthService.allowedPathsWithGemUser])) {
                    forbiddenError({ res, code: 'METHOD_NOT_ALLOWED', title: 'This call is not allowed for regular users' });
                } else {
                    next();
                }
            } else if (gemUser) {
                const countryCodes = [BrandCode.main, ...gemUser.countries.map(country => country.country_code)];
                if (!AuthService.matchesPath(req, AuthService.allowedPathsWithGemUser)) {
                    forbiddenError({ res, code: 'METHOD_NOT_ALLOWED', title: 'This call is not allowed for gem users' });
                } else if (!countryCodes.includes(req.brandCode)) {
                    forbiddenError({ res, code: 'METHOD_NOT_ALLOWED', title: 'Not authorized for this country' });
                } else {
                    next();
                }
            } else {
                console.log('user not completed or not found');
                // user not completed or not found
                unauthorized({ res });
            }
        } else {
            // not a valid token, disallow
            console.log('invalid token');
            unauthorized({ res });
        }
    }

    private static getJwtFromHeader(req: Request) {
        if (req.headers.authorization?.split(' ')[0] === 'Bearer') {
            return req.headers.authorization.split(' ')[1].trim();
        }
    }

    private static matchesPath(req: Request, paths: { url: RegExp; methods: string[]; roles?: GemUserRole[]; type?: RequestType }[]) {
        for (const path of paths) {
            const matchesMethod = path.methods.includes(req.method);
            const matchesUrl = path.url.test(req.url);
            if (matchesMethod && matchesUrl) {
                if (path.roles) {
                    return req.gemUser && path.roles.includes(req.gemUser.role);
                }
                req.requestType = path.type;
                return true;
            }
        }
        return false;
    }

    static async userAllowedWithJwt(req: Request, jwt: TokenObject<SitlyUserTokenData>, tokenType: SitlyTokenType) {
        if (req.brandCode === BrandCode.main) {
            return;
        }
        if (jwt.data?.type && jwt.data.type !== tokenType) {
            return;
        }

        const user = await getModels(req.brandCode).User.byId(jwt.data.userId);
        if (jwt.data.userUrl && user?.customUser?.webuser_url !== jwt.data.userUrl) {
            return;
        }
        return user ?? undefined;
    }

    private static async userAllowedWithGemUserJwt(jwt: TokenObject<GemUserTokenData>) {
        if (jwt.data?.type && jwt.data.type !== SitlyTokenType.gemAccess) {
            return undefined;
        }

        return getMainModels().GemUser.byId(jwt.data.gemUserId);
    }
}
