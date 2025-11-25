import { Component, OnInit, ViewChild, ElementRef, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BaseComponent } from 'app/components/base.component';
import { AppEventService } from 'app/services/event.service';
import { takeUntil } from 'rxjs/operators';
import { RouteType } from 'routing/route-type';
import { RecommendationScreen } from 'modules/shared/enums/recommendation-screen';
import {
    RecommendationMessageComponent,
    RecommendationMessageSuccessEvent,
} from 'app/modules/recommendations/recommendation-message/recommendation-message.component';
import { RecommendationsInfoDialogComponent } from 'app/modules/recommendations/recommendations-info-dialog/recommendations-info-dialog.component';
import { RecommendationEmailComponent } from 'app/modules/recommendations/recommendation-email/recommendation-email.component';
import { RecommendationInfoComponent } from 'app/modules/recommendations/recommendation-info/recommendation-info.component';
import { RecommendationUserNameComponent } from 'app/modules/recommendations/recommendation-user-name/recommendation-user-name.component';
import { SharedModule } from 'modules/shared/shared.module';

@Component({
    selector: 'recommendations',
    templateUrl: './recommendations.component.html',
    styleUrls: ['./recommendations.component.less'],
    standalone: true,
    imports: [
        SharedModule,
        RecommendationUserNameComponent,
        RecommendationMessageComponent,
        RecommendationInfoComponent,
        RecommendationEmailComponent,
    ],
})
export class RecommendationsComponent extends BaseComponent implements OnInit {
    readonly route = inject(ActivatedRoute);
    readonly eventsService = inject(AppEventService);

    RecommendationScreen = RecommendationScreen;
    screen: RecommendationScreen;

    private _recommendationsLink: string;

    @ViewChild('contentContainer', { static: true })
    private contentContainer: ElementRef<HTMLElement>;

    ngOnInit() {
        // request check for change when content of contentContainer changed
        // this means that new component was loaded and toolbar needs to be updated as well
        const mutationObserver = new MutationObserver(mutations => {
            mutations.forEach(_mutation => {
                this.cd.markForCheck();
            });
        });
        mutationObserver.observe(this.contentContainer.nativeElement, {
            childList: true,
            subtree: true,
        });

        this.initRouteSubscription();
    }

    private initRouteSubscription() {
        this.route.paramMap.pipe(takeUntil(this.destroyed$)).subscribe(params => {
            this.screen = (params.get('screen') as RecommendationScreen) ?? RecommendationScreen.name;

            setTimeout(() => {
                this.cd.markForCheck();
            }, 0);
        });
    }

    back() {
        super.back(false);
    }

    close() {
        super.back(true);
    }

    showInfo() {
        if (this.isDesktop()) {
            this.navigationService.navigate(RouteType.recommendations, { screen: RecommendationScreen.info });
        } else {
            this.overlayService.openOverlay(RecommendationsInfoDialogComponent);
        }
    }

    get recommendationLink() {
        return this._recommendationsLink;
    }

    onSuccess(event: RecommendationMessageSuccessEvent) {
        this.eventsService.notifyRecommendationSent({ name: event.name, shareMethod: event.shareMethod });
    }
}
