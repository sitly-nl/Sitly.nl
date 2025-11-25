import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FacebookPhotosComponent } from 'modules/facebook/facebook-photos/facebook-photos.component';

const routes: Routes = [
    {
        path: '',
        component: FacebookPhotosComponent,
        pathMatch: 'full',
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class FacebookRoutingModule {}
