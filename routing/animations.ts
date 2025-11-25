import { RouteType } from 'routing/route-type';
import { trigger, transition, style, query, group, animate } from '@angular/animations';
import { EnvironmentUtils } from 'app/utils/device-utils';
import { AuthSubRouteType } from 'modules/auth//auth-route-type';

const openSlideTransitions = [
    [AuthSubRouteType.signIn, AuthSubRouteType.forgotPassword],
    [AuthSubRouteType.signIn, AuthSubRouteType.signUp],
    [AuthSubRouteType.signIn, RouteType.search],
    [AuthSubRouteType.signIn, RouteType.complete],
    [AuthSubRouteType.signUp, RouteType.complete],
    [RouteType.complete, RouteType.search],
].map(item => transition(`${item[0]} => ${item[1]}`, slide(true)));

const mobileOnlyOpenSlideTransitions = [
    [RouteType.favorites, RouteType.users],
    [RouteType.search, RouteType.users],
    [RouteType.invites, RouteType.users],
    [RouteType.messages, RouteType.chat],
    [RouteType.messages, RouteType.instantJob],
].map(item => transition(`${item[0]} => ${item[1]}`, slide(true)));

const closeSlideTransitions = [
    [RouteType.account, AuthSubRouteType.signIn],
    [AuthSubRouteType.forgotPassword, AuthSubRouteType.signIn],
    [AuthSubRouteType.signUp, AuthSubRouteType.signIn],
    [RouteType.complete, AuthSubRouteType.signIn],
].map(item => transition(`${item[0]} => ${item[1]}`, slide(false)));

const mobileOnlyCloseSlideTransitions = [
    [RouteType.users, RouteType.favorites],
    [RouteType.users, RouteType.search],
    [RouteType.users, RouteType.invites],
    [RouteType.chat, RouteType.messages],
    [RouteType.instantJob, RouteType.messages],
].map(item => transition(`${item[0]} => ${item[1]}`, slide(false)));

const transitions = [...openSlideTransitions, ...closeSlideTransitions, transition('* => *', fadeIn())];
export const routesAnimation = trigger(
    'routeAnimations',
    EnvironmentUtils.isDesktop() ? transitions : [...mobileOnlyOpenSlideTransitions, ...mobileOnlyCloseSlideTransitions, ...transitions],
);

export function slide(open: boolean, registration = false) {
    return [
        query(
            ':enter, :leave',
            style({
                position: 'fixed',
                width: '100%',
                height: '100%',
                ...(registration ? { 'padding-top': '93px', 'bottom': 0 } : {}), // 93px - progress bar height in registration
            }),
            { optional: true },
        ),
        group([
            query(
                ':enter',
                [
                    style({ transform: open ? 'translateX(100%)' : 'translateX(-100%)' }),
                    animate('0.25s ease-in-out', style({ transform: 'translateX(0%)' })),
                ],
                { optional: true },
            ),
            query(
                ':leave',
                [
                    style({ transform: 'translateX(0%)' }),
                    animate('0.25s ease-in-out', style({ transform: open ? 'translateX(-100%)' : 'translateX(100%)' })),
                ],
                { optional: true },
            ),
        ]),
    ];
}

export function fadeIn() {
    return [
        query(':enter, :leave', style({ position: 'fixed', width: '100%', height: '100%', opacity: 0 }), {
            optional: true,
        }),
        query(':enter', [animate('0.45s ease', style({ opacity: 1 }))], { optional: true }),
    ];
}
