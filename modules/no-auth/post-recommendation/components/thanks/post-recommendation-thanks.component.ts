import { Component, Input, inject } from '@angular/core';
import { NoAuthBaseComponent } from 'app/components/no-auth-base.component';
import { RecommendationsService } from 'app/modules/recommendations/services/recommendations.service';
import { SessionService } from 'app/services/session.service';
import { RecommendationData } from 'modules/post-recommendation/post-recommendation.component';
import { TranslateModule } from '@ngx-translate/core';
import { DecimalPipe } from '@angular/common';
import { PostRecommendationGreetingComponent } from 'modules/post-recommendation/components/greeting/post-recommendation-greeting.component';

@Component({
    selector: 'post-recommendation-thanks',
    templateUrl: './post-recommendation-thanks.component.html',
    styleUrls: ['./post-recommendation-thanks.component.less'],
    standalone: true,
    imports: [PostRecommendationGreetingComponent, DecimalPipe, TranslateModule],
})
export class PostRecommendationThanksComponent extends NoAuthBaseComponent {
    readonly recommendationService = inject(RecommendationsService);

    @Input({ required: true }) data: RecommendationData;
    sittersNumber?: number;
    sessionService = inject(SessionService);

    ngOnInit() {
        this.recommendationService.getSittersTotalNumber().subscribe(res => {
            this.sittersNumber = Math.floor(res.totalCount / 1_000) * 1_000;
            this.cd.markForCheck();
        });
    }

    onSignup() {
        if (this.sessionService.isLoggedIn) {
            this.sessionService.navigateToDefaultRoute();
        } else if (this.countrySettingsService.countrySettings) {
            window.location.href = this.countrySettingsService.countrySettings.frontendUrl;
        }
    }
}
