import { RouterModule, Routes } from '@angular/router';
import { PostRecommendationComponent } from 'modules/post-recommendation/post-recommendation.component';
import { NgModule } from '@angular/core';

const routes: Routes = [
    {
        path: '',
        component: PostRecommendationComponent,
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class PostRecommendationRoutingModule {}
