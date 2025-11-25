import { NgModule } from '@angular/core';
import { SharedModule } from 'modules/shared/shared.module';
import { RecommendationEmailComponent } from 'app/modules/recommendations/recommendation-email/recommendation-email.component';
import { RecommendationMessageComponent } from 'app/modules/recommendations/recommendation-message/recommendation-message.component';
import { RecommendationUserNameComponent } from 'app/modules/recommendations/recommendation-user-name/recommendation-user-name.component';
import { RecommendationsComponent } from 'app/modules/recommendations/recommendations.component';
import { RecommendationsRoutingModule } from 'app/modules/recommendations/recommendations-routing.module';
import { RecommendationInfoComponent } from 'app/modules/recommendations/recommendation-info/recommendation-info.component';
import { RecommendationsInfoDialogComponent } from 'app/modules/recommendations/recommendations-info-dialog/recommendations-info-dialog.component';
import { FormsModule } from '@angular/forms';

@NgModule({
    imports: [
        SharedModule,
        FormsModule,
        RecommendationsRoutingModule,
        RecommendationsComponent,
        RecommendationEmailComponent,
        RecommendationMessageComponent,
        RecommendationUserNameComponent,
        RecommendationInfoComponent,
        RecommendationsInfoDialogComponent,
    ],
})
export default class RecommendationsModule {}
