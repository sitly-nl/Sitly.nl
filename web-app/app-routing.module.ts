import { NgModule, Type } from '@angular/core';
import { Route, RouterModule, Routes } from '@angular/router';
import { AccountComponent } from 'app/components/account/account.component';
import { RouteType } from 'routing/route-type';
import { SettingsComponent } from 'app/components/settings/settings.component';
import { EnvironmentUtils } from 'app/utils/device-utils';
import { CombinedChatComponent } from 'app/components/conversations/combined-chat/combined-chat.component';
import { MessagesComponent } from 'app/components/conversations/messages/messages.component';
import { ChatComponent } from 'app/components/conversations/chat/chat.component';
import { InstantJobDetailsComponent } from 'app/components/instant-job/instant-job-details.component';
import { SearchComponent } from 'app/components/search/search.component';
import { FavoritesComponent } from 'app/components/favorites/favorites.component';
import { InvitesComponent } from 'app/components/invites/invites.component';
import { ProfileComponent } from 'app/components/user/profile/profile.component';
import { defaultRouteGuards, lazyLoadRoute, lazyLoadStandaloneRoute } from 'routing/routes';

const route = (
    type: RouteType | { path: string; type: RouteType },
    component: Type<unknown> | { children: Routes },
    pathMatch: 'prefix' | 'full' = 'full',
) => {
    const routeType = typeof type === 'string' ? type : type.type;
    return {
        path: typeof type === 'string' ? type : type.path,
        pathMatch,
        canActivate: defaultRouteGuards,
        data: { animation: routeType, routeType },
        ...('children' in component ? component : { component }),
    } as Route;
};

const routes: Routes = [
    { path: 'app/account', redirectTo: 'account' },
    route(RouteType.account, AccountComponent),
    route(RouteType.settings, SettingsComponent),
    route(
        { type: RouteType.chat, path: 'messages/:userId' },
        EnvironmentUtils.isDesktop() ? CombinedChatComponent : ChatComponent,
        'prefix',
    ),
    route(RouteType.messages, EnvironmentUtils.isDesktop() ? CombinedChatComponent : MessagesComponent),
    route(
        { type: RouteType.instantJob, path: 'instant-job/:parentId/:lastMessageId' },
        EnvironmentUtils.isDesktop() ? CombinedChatComponent : InstantJobDetailsComponent,
        'prefix',
    ),
    route(
        RouteType.search,
        {
            children: [
                { path: '', component: SearchComponent, pathMatch: 'full' },
                { path: ':searchType', component: SearchComponent },
            ],
        },
        'prefix',
    ),
    route(RouteType.favorites, FavoritesComponent),
    route(RouteType.invites, InvitesComponent),
    route({ type: RouteType.users, path: 'users/:userId' }, ProfileComponent, 'prefix'),

    lazyLoadStandaloneRoute(RouteType.hidden, () => import('app/modules/hidden-users/hidden-users.component')),

    lazyLoadStandaloneRoute(RouteType.addressChange, () => import('app/modules/address-change/address-change.component')),
    lazyLoadRoute('premium', () => import('app/modules/premium/premium.module'), true),
    lazyLoadRoute(RouteType.recommendations, () => import('app/modules/recommendations/recommendations.module'), true),
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class AppRoutingModule {}
