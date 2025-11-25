import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PostRecommendationRateUserComponent } from 'modules/post-recommendation/components/rate-user/post-recommendation-rate-user.component';
import { TranslateModule } from '@ngx-translate/core';
import { PostRecommendationComponent } from 'modules/post-recommendation/post-recommendation.component';
import { PostRecommendationRoutingModule } from 'modules/post-recommendation/post-recommendation.routing.module';
import { PostRecommendationTranslateService } from 'modules/post-recommendation/services/post-recommendation-translate.service';
import { PostRecommendationReviewUserComponent } from 'modules/post-recommendation/components/review-user/post-recommendation-review-user.component';
import { PostRecommendationProfilePictureComponent } from 'modules/post-recommendation/components/profile-picture/post-recommendation-profile-picture.component';
import { PostRecommendationRatingBarComponent } from 'modules/post-recommendation/components/rating-bar/post-recommendation-rating-bar.component';
import { SharedModule } from 'modules/shared/shared.module';
import { PostRecommendationThanksComponent } from 'modules/post-recommendation/components/thanks/post-recommendation-thanks.component';
import { PostRecommendationGreetingComponent } from 'modules/post-recommendation/components/greeting/post-recommendation-greeting.component';
import { NoAuthTemplateComponent } from 'modules/no-auth/no-auth-template.component';
import { translateModuleConfig } from 'app/services/translation.service';

@NgModule({
    imports: [
        CommonModule,
        SharedModule,
        TranslateModule.forChild(translateModuleConfig(PostRecommendationTranslateService)),
        PostRecommendationRoutingModule,
        NoAuthTemplateComponent,
        PostRecommendationComponent,
        PostRecommendationRateUserComponent,
        PostRecommendationReviewUserComponent,
        PostRecommendationThanksComponent,
        PostRecommendationProfilePictureComponent,
        PostRecommendationRatingBarComponent,
        PostRecommendationGreetingComponent,
    ],
})
export default class PostRecommendationModule {}
