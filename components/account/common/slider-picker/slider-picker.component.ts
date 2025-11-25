import { Component, Input, Output, OnChanges, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';

export interface SliderOption {
    value: number;
    label: string;
}

@Component({
    selector: 'slider-picker',
    templateUrl: './slider-picker.component.html',
    styleUrls: ['./slider-picker.component.less'],
    standalone: true,
    imports: [FormsModule, TranslateModule],
})
export class SliderPickerComponent implements OnChanges {
    @Input() options: SliderOption[] = [];
    @Input() showLabels = false;
    @Input({ required: true }) value: number;
    @Output() readonly valueChanged = new EventEmitter<number>();

    @ViewChild('filledRange', { static: true }) private range: ElementRef<HTMLDivElement>;
    @ViewChild('thumb', { static: true }) private thumb: ElementRef<HTMLDivElement>;

    selectedIndex = 0;

    get min() {
        return 0;
    }

    get max() {
        return this.options.length - 1;
    }

    ngOnChanges() {
        this.validateValue();
        this.selectedIndex = this.options?.findIndex(item => item.value === this.value) ?? 0;
        this.updateFilledRange();
    }

    onInput() {
        this.value = this.options[this.selectedIndex].value;
        this.updateFilledRange();
    }

    onChange() {
        this.valueChanged.emit(this.value);
    }

    private validateValue() {
        if (this.options?.find(item => item.value === this.value)) {
            return;
        }

        this.value = this.options[this.min]?.value;
    }

    private positionForValue(value: number) {
        return (value * 100) / this.max;
    }

    private updateFilledRange() {
        this.thumb.nativeElement.style.left = `${this.positionForValue(this.selectedIndex)}%`;
        this.range.nativeElement.style.right = `${100 - this.positionForValue(this.selectedIndex)}%`;
    }
}
