import { Component } from '@angular/core';
import { BaseOverlayComponent } from 'app/components/common/overlay-content/base-overlay.component';
import { RecommendationInfoComponent } from 'app/modules/recommendations/recommendation-info/recommendation-info.component';
import { SharedModule } from 'modules/shared/shared.module';

@Component({
    selector: 'recommendations-info-dialog',
    templateUrl: './recommendations-info-dialog.component.html',
    styleUrls: ['./recommendations-info-dialog.component.less'],
    standalone: true,
    imports: [SharedModule, RecommendationInfoComponent],
})
export class RecommendationsInfoDialogComponent extends BaseOverlayComponent {}
