import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RecommendationsService } from 'app/modules/recommendations/services/recommendations.service';
import { AppEventService } from 'app/services/event.service';
import { takeUntil } from 'rxjs/operators';
import { PromptEvents } from 'app/services/tracking/types';
import { ShareMethod } from 'app/models/api/country-settings-interface';
import { BaseComponent } from 'app/components/base.component';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'recommendation-email',
    templateUrl: './recommendation-email.component.html',
    styleUrls: ['./recommendation-email.component.less'],
    standalone: true,
    imports: [FormsModule, TranslateModule],
})
export class RecommendationEmailComponent extends BaseComponent implements OnInit {
    readonly route = inject(ActivatedRoute);
    readonly recommendationsService = inject(RecommendationsService);
    readonly eventService = inject(AppEventService);

    name: string;
    recommendationLink: string;
    message: string;
    email: string;
    loading = false;

    ngOnInit() {
        this.route.paramMap.pipe(takeUntil(this.destroyed$)).subscribe(params => {
            this.name = params.get('name') ?? '';
            this.recommendationLink = params.get('link') ?? '';
            this.message = params.get('message') ?? '';
            this.cd.markForCheck();
        });
    }

    sendEmail() {
        this.loading = true;

        this.trackingService.trackPromptClickEvent(PromptEvents.recommendationParentFirstnameEmail);
        this.recommendationsService.askRecommendationViaEmail(this.email, this.name, this.recommendationLink, this.message).subscribe(
            _ => {
                this.loading = false;
                this.eventService.notifyRecommendationSent({ name: this.name, shareMethod: ShareMethod.email });
            },
            _ => {
                this.loading = false;
            },
        );
    }
}
