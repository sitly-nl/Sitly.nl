import { inject, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { RecommendationData } from 'modules/post-recommendation/post-recommendation.component';
import { finalize } from 'rxjs/operators';
import { Error } from 'app/services/api/api.service';
import { RecommendationsService } from 'app/modules/recommendations/services/recommendations.service';
import { NoAuthBaseComponent } from 'app/components/no-auth-base.component';
import { StandardOverlayComponent } from 'app/components/common/overlay-content/standard-overlay/standard-overlay.component';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';
import { PostRecommendationProfilePictureComponent } from 'modules/post-recommendation/components/profile-picture/post-recommendation-profile-picture.component';
import { PostRecommendationRatingBarComponent } from 'modules/post-recommendation/components/rating-bar/post-recommendation-rating-bar.component';

@Component({
    selector: 'post-recommendation-review-user',
    templateUrl: './post-recommendation-review-user.component.html',
    styleUrls: ['./post-recommendation-review-user.component.less'],
    standalone: true,
    imports: [PostRecommendationProfilePictureComponent, PostRecommendationRatingBarComponent, SharedModule, TranslateModule],
})
export class PostRecommendationReviewUserComponent extends NoAuthBaseComponent {
    readonly recommendationService = inject(RecommendationsService);

    @ViewChild('text', { static: true }) textAreaRef: ElementRef<HTMLTextAreaElement>;
    @Output() review = new EventEmitter();
    @Input({ required: true }) data: RecommendationData;
    @Input({ required: true }) rating: number;
    @Input({ required: true }) userId: string;
    @Input({ required: true }) token: string;

    loading = false;
    hasError = false;

    postReview(text: string) {
        if (text.length > 1000 || text.length < 30) {
            this.hasError = true;
            return;
        }

        this.loading = !!text;
        this.recommendationService
            .postRecommendation(this.userId, this.token, text, this.rating)
            .pipe(
                finalize(() => {
                    this.loading = false;
                    this.cd.markForCheck();
                }),
            )
            .subscribe(
                _ => this.review.emit(),
                (error: Error<{ title: string }>) => {
                    this.overlayService.openOverlay(StandardOverlayComponent, {
                        title: error.error?.errors?.[0].title,
                        primaryBtn: { title: 'main.close' },
                    });
                },
            );
    }

    onKeyup(text: string) {
        if (text.length <= 1000 && text.length >= 30) {
            this.hasError = false;
        }
    }
}
