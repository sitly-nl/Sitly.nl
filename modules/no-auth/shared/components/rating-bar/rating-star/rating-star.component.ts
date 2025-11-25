import { Component, Input } from '@angular/core';

@Component({
    selector: 'rating-star',
    templateUrl: './rating-star.component.html',
    styleUrls: ['./rating-star.component.less'],
})
export class RatingStarComponent {
    private _fulness = 0;
    @Input() set fulness(value: number) {
        this._fulness = Math.min(Math.max(value ?? 0, 0), 100);
    }
    get fulness() {
        return this._fulness;
    }

    private _size = 0;
    @Input() set size(value: number) {
        this._size = Math.max(value ?? 0, 0);
    }
    get size() {
        return this._size;
    }

    @Input() hasBorder = false;

    get foregroundStarWidth() {
        return `${(this.size * this.fulness) / 100}px`;
    }
    get containerWidth() {
        return `${this.size}px`;
    }
    get containerHeight() {
        return `${this.size}px`;
    }
}
