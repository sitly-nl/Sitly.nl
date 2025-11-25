import { Component, inject, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NoAuthBaseComponent } from 'app/components/no-auth-base.component';
import { Gender } from 'app/models/api/user';
import { Constants } from 'app/utils/constants';
import { EnvironmentUtils } from 'app/utils/device-utils';
import { JwtUtils } from 'app/utils/jwt-utils';
import { NoAuthTemplateComponent } from 'modules/no-auth/no-auth-template.component';
import { PostRecommendationThanksComponent } from 'modules/post-recommendation/components/thanks/post-recommendation-thanks.component';
import { PostRecommendationReviewUserComponent } from 'modules/post-recommendation/components/review-user/post-recommendation-review-user.component';
import { PostRecommendationRateUserComponent } from 'modules/post-recommendation/components/rate-user/post-recommendation-rate-user.component';

export interface RecommendationData {
    fosterId: number;
    parentFirstName: string;
    fosterName: string;
    fosterGender: Gender;
    fosterAvatar: string;
    type: string;
}

@Component({
    selector: 'post-recommendation',
    templateUrl: './post-recommendation.component.html',
    styleUrls: ['./post-recommendation.component.less'],
    standalone: true,
    imports: [
        NoAuthTemplateComponent,
        PostRecommendationRateUserComponent,
        PostRecommendationReviewUserComponent,
        PostRecommendationThanksComponent,
    ],
})
export class PostRecommendationComponent extends NoAuthBaseComponent {
    readonly route = inject(ActivatedRoute);

    step: 'rate' | 'review' | 'thanks' = 'rate';
    token?: string;
    userId?: string;
    recommendationData?: RecommendationData;

    currentYear = new Date().getFullYear();
    isAndroid = EnvironmentUtils.isAndroid;
    isIos = EnvironmentUtils.isIos;
    rating: number;

    appStoreUrl: string;
    googlePlayUrl = Constants.googlePlayUrl;

    @ViewChild(NoAuthTemplateComponent) container: NoAuthTemplateComponent;

    ngOnInit() {
        this.userId = this.route.snapshot.paramMap.get('userId') ?? undefined;
        this.token = this.route.snapshot.queryParamMap.get('token') ?? undefined;
        this.recommendationData = JwtUtils.parse<{ data: RecommendationData }>(this.token)?.data;

        const countryCode = this.storageService.countryCode;
        if (countryCode) {
            this.appStoreUrl = `https://itunes.apple.com/${countryCode.toLowerCase()}/app/sitly-babysitters-jobs/id1266270476`;
        }

        if (!this.countrySettings) {
            this.countrySettingsService.refreshCountrySettings().subscribe(_ => this.cd.markForCheck());
        }
    }

    onRateGiven(rating: number) {
        this.rating = rating;
        this.step = 'review';
        this.container.scrollToTop();
    }

    onReviewGiven() {
        this.step = 'thanks';
        this.container.scrollToTop();
    }
}
