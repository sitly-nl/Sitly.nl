import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PremiumComponent } from 'app/modules/premium/premium.component';
import { RouteType } from 'routing/route-type';
import { PremiumStartComponent } from 'app/modules/premium/premium-start/premium-start.component';
import { PaymentMethodsComponent } from 'app/modules/premium/payment-methods/payment-methods.component';

const routes: Routes = [
    {
        path: '',
        component: PremiumComponent,
        children: [
            {
                path: '',
                redirectTo: RouteType.premiumStart,
                pathMatch: 'full',
            },
            {
                path: 'premium-start',
                component: PremiumStartComponent,
                pathMatch: 'prefix',
            },
            {
                path: 'payment-methods',
                component: PaymentMethodsComponent,
                pathMatch: 'full',
            },
        ],
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class PremiumRoutingModule {}
