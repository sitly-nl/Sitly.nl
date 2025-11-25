import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { SwiperModule } from 'swiper/angular';
import { DateFnsModule } from 'ngx-date-fns';
import { SharedModule } from 'modules/shared/shared.module';
import { PremiumRoutingModule } from 'app/modules/premium/premium-routing.module';
import { PremiumComponent } from 'app/modules/premium/premium.component';
import { PremiumStartComponent } from 'app/modules/premium/premium-start/premium-start.component';
import { PaymentMethodsComponent } from 'app/modules/premium/payment-methods/payment-methods.component';
import { PremiumSwiperComponent } from 'app/components/premium-swiper/premium-swiper.component';
import { PremiumStartContentComponent } from 'app/modules/premium/premium-start/premium-start-content/premium-start-content.component';

@NgModule({
    imports: [
        SharedModule,
        PremiumRoutingModule,
        ReactiveFormsModule,
        SwiperModule,
        DateFnsModule,
        PremiumSwiperComponent,
        PremiumComponent,
        PremiumStartComponent,
        PaymentMethodsComponent,
        PremiumStartContentComponent,
    ],
})
export default class PremiumModule {}
