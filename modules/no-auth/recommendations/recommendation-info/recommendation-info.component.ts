import { Component, EventEmitter, Output } from '@angular/core';
import { BaseComponent } from 'app/components/base.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'recommendation-info',
    templateUrl: './recommendation-info.component.html',
    styleUrls: ['./recommendation-info.component.less'],
    standalone: true,
    imports: [TranslateModule],
})
export class RecommendationInfoComponent extends BaseComponent {
    @Output() ok = new EventEmitter<boolean>();
}
