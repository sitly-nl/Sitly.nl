import { Component, Output, Input, EventEmitter } from '@angular/core';
import { NoAuthBaseComponent } from 'app/components/no-auth-base.component';
import { RecommendationData } from 'modules/post-recommendation/post-recommendation.component';
import { TranslateModule } from '@ngx-translate/core';
import { PostRecommendationGreetingComponent } from 'modules/post-recommendation/components/greeting/post-recommendation-greeting.component';
import { PostRecommendationProfilePictureComponent } from 'modules/post-recommendation/components/profile-picture/post-recommendation-profile-picture.component';
import { PostRecommendationRatingBarComponent } from 'modules/post-recommendation/components/rating-bar/post-recommendation-rating-bar.component';

@Component({
    selector: 'post-recommendation-rate-user',
    templateUrl: './post-recommendation-rate-user.component.html',
    styleUrls: ['./post-recommendation-rate-user.component.less'],
    standalone: true,
    imports: [
        PostRecommendationGreetingComponent,
        PostRecommendationProfilePictureComponent,
        PostRecommendationRatingBarComponent,
        TranslateModule,
    ],
})
export class PostRecommendationRateUserComponent extends NoAuthBaseComponent {
    @Output() rate = new EventEmitter<number>();
    @Input({ required: true }) data: RecommendationData;
}
