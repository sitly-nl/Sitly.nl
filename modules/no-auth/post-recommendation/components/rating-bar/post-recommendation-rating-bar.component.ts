import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
    selector: 'post-recommendation-rating-bar',
    templateUrl: './post-recommendation-rating-bar.component.html',
    styleUrls: ['./post-recommendation-rating-bar.component.less'],
    standalone: true,
    imports: [],
})
export class PostRecommendationRatingBarComponent {
    @Input() rating = 0;
    @Input() color: 'dark' | 'yellow' = 'dark';
    @Input() clickable = true;
    @Input() hoverable = false;
    @Output() rate = new EventEmitter<number>();

    starClicked(index: number) {
        if (this.clickable) {
            this.rating = index;
            this.rate.emit(index);
        }
    }

    onStarHover(index: number) {
        if (this.hoverable) {
            this.rating = index;
        }
    }
}
