import { Component, Input, ViewChild, ElementRef, OnInit } from '@angular/core';

@Component({
    selector: 'rating-bar',
    templateUrl: './rating-bar.component.html',
    styleUrls: ['./rating-bar.component.less'],
})
export class RatingBarComponent implements OnInit {
    @Input() starsHaveBorder = false;
    @Input('rating') set rating(value: number) {
        this.ratingValue = !value || value < 0 || value > this.starsNumber ? 0 : value;
    }
    @Input('text') set text(value: string | null) {
        this.textValue = value ?? '';
    }
    @Input({ required: true }) starSize: number;
    @Input() textSize?: number;
    @Input() textColor?: string;

    Math = Math;

    ratingValue = 0;
    starsNumber = 5;
    textValue: string;

    @ViewChild('text', { static: true }) private textElement: ElementRef<HTMLSpanElement>;

    ngOnInit() {
        if (this.starSize) {
            this.textElement.nativeElement.style.fontSize = `${this.starSize}px`;
        }

        if (this.textSize) {
            this.textElement.nativeElement.style.fontSize = `${this.textSize}px`;
        }

        if (this.textColor) {
            this.textElement.nativeElement.style.color = this.textColor;
        }
    }
}
