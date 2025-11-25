import { Component, ViewChild, ElementRef, Input, Output, EventEmitter } from '@angular/core';

@Component({
    selector: 'slider',
    templateUrl: './slider.component.html',
    styleUrls: ['./slider.component.less'],
    standalone: true,
})
export class SliderComponent {
    @Input() minRangeValue = 0;
    @Input() maxRangeValue = 100;
    @Input() maxValueLabel?: string;

    get minValue() {
        return this._minValue;
    }
    @Input() set minValue(newValue) {
        if (newValue !== this._minValue) {
            this._minValue = Math.max(newValue, this.minRangeValue);
            this.thumbMin.nativeElement.style.left = `${this.positionForValue(this._minValue)}%`;
            this.updateFilledRange();
        }
    }
    @Output() readonly minValueChanged = new EventEmitter<number>();

    get maxValue() {
        return this._maxValue;
    }
    @Input() set maxValue(newValue) {
        if (newValue !== this._maxValue) {
            this._maxValue = Math.min(newValue, this.maxRangeValue);
            this.thumbMax.nativeElement.style.left = `${this.positionForValue(this._maxValue)}%`;
            this.updateFilledRange();
        }
    }
    @Output() readonly maxValueChanged = new EventEmitter<number>();

    get maxValueFormatted() {
        if (this.maxValueLabel && this.maxValue === this.maxRangeValue) {
            return this.maxValueLabel;
        }
        return `${this.maxValue}`;
    }

    private _minValue = 0;
    private _maxValue = 0;

    @ViewChild('thumbMin', { static: true }) private thumbMin: ElementRef<HTMLDivElement>;
    @ViewChild('thumbMax', { static: true }) private thumbMax: ElementRef<HTMLDivElement>;
    @ViewChild('range', { static: true }) private range: ElementRef<HTMLDivElement>;

    onInput(event: Event) {
        const el = event.target as HTMLInputElement;
        let newValue = parseInt(el.value, 10);

        if (el.name === 'min') {
            if (this._maxValue - newValue < 1) {
                newValue = this._maxValue - 1;
                el.value = newValue.toString();
            }
            this.minValue = newValue;
            this.minValueChanged.emit(this.minValue);
        } else if (el.name === 'max') {
            if (newValue - this._minValue < 1) {
                newValue = this._minValue + 1;
                el.value = newValue.toString();
            }
            this.maxValue = newValue;
            this.maxValueChanged.emit(this.maxValue);
        }
    }

    private positionForValue(value: number) {
        return ((value - this.minRangeValue) * 100) / (this.maxRangeValue - this.minRangeValue);
    }

    private updateFilledRange() {
        this.range.nativeElement.style.left = `${this.positionForValue(this.minValue)}%`;
        this.range.nativeElement.style.right = `${100 - this.positionForValue(this.maxValue)}%`;
    }
}
