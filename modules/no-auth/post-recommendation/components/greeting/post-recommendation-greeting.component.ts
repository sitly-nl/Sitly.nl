import { Component, Input } from '@angular/core';
import { Gender } from 'app/models/api/user';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'post-recommendation-greeting',
    templateUrl: './post-recommendation-greeting.component.html',
    styleUrls: ['./post-recommendation-greeting.component.less'],
    standalone: true,
    imports: [TranslateModule],
})
export class PostRecommendationGreetingComponent {
    @Input({ required: true }) title: string;
    @Input({ required: true }) subtitle: string;
    @Input() titleArgs?: Record<string, string | Gender>;
    @Input() subtitleArgs?: Record<string, string | Gender>;
}
