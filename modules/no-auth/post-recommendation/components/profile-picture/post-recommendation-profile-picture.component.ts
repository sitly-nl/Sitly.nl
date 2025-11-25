import { Component, Input } from '@angular/core';
import { Gender } from 'app/models/api/user';

@Component({
    selector: 'post-recommendation-profile-picture',
    templateUrl: './post-recommendation-profile-picture.component.html',
    styleUrls: ['./post-recommendation-profile-picture.component.less'],
    standalone: true,
    imports: [],
})
export class PostRecommendationProfilePictureComponent {
    @Input() avatarUrl?: string;
    @Input() gender = Gender.female;
}
