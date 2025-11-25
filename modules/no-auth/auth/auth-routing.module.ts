import { NgModule, Type } from '@angular/core';
import { Route, RouterModule, Routes } from '@angular/router';
import { SignInComponent } from 'modules/auth/components/sign-in/sign-in.component';
import { SignUpComponent } from 'modules/auth/components/sign-up/sign-up.component';
import { ForgotPasswordComponent } from 'modules/auth/components/forgot-password/forgot-password.component';
import { AuthSubRouteType } from 'modules/auth//auth-route-type';
import { SignUpSSOComponent } from 'modules/auth/components/sign-up-sso/sign-up-sso.component';

const route = (type: AuthSubRouteType | { path: string; type: AuthSubRouteType }, component: Type<unknown>) => {
    return {
        path: typeof type === 'string' ? type : type.path,
        component,
        data: { animation: typeof type === 'string' ? type : type.type },
    } as Route;
};

const routes: Routes = [
    { path: '', redirectTo: AuthSubRouteType.signIn, pathMatch: 'full' },
    route(AuthSubRouteType.signIn, SignInComponent),
    route(AuthSubRouteType.signUp, SignUpComponent),
    route({ path: `${AuthSubRouteType.signUp}/:provider`, type: AuthSubRouteType.signUp }, SignUpSSOComponent),
    route(AuthSubRouteType.forgotPassword, ForgotPasswordComponent),
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class AuthRoutingModule {}
