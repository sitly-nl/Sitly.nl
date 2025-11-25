import {
    Component,
    Input,
    Output,
    EventEmitter,
    ElementRef,
    ChangeDetectionStrategy,
    OnInit,
    ChangeDetectorRef,
    inject,
} from '@angular/core';
import { DatepickerModel, MinMaxDateModel, MinMaxYearModel } from 'app/components/common/date-picker/datepicker-model';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';

export interface DatePickerEvent {
    originalTarget: unknown;
    target: HTMLInputElement;
    date?: Date;
}

@Component({
    selector: 'datepicker',
    templateUrl: 'datepicker.component.html',
    styleUrls: ['./datepicker.component.base.less'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [FormsModule, TranslateModule],
})
export class DatepickerComponent implements OnInit {
    private ref = inject<ElementRef<HTMLDivElement>>(ElementRef);
    private cd = inject(ChangeDetectorRef);

    @Input() minDate?: string;
    @Input() maxDate?: string;
    @Input() minYear = new Date().getFullYear() - 100;
    @Input() maxYear = new Date().getFullYear() + 10;
    @Input() yearOrder = 'desc';
    @Input() day: number;
    @Input() month: number;
    @Input() year: number;
    @Input() value: number | string;
    @Input() restrictDateToYear = false;
    @Input() border = true;
    @Input() transparent = true;
    @Input() showPlaceholder = true;
    @Input() separatorColor = '#22313e';
    @Output() dateUpdated = new EventEmitter<DatePickerEvent>();

    model: DatepickerModel;

    get availableDays() {
        return this.model.availableDays;
    }

    get availableMonths() {
        return this.model.availableMonths;
    }

    get availableYears() {
        return this.model.availableYears;
    }

    protected seconds: Record<string, number> = {
        minute: 60,
        minutes: 60,
        hour: 3600,
        hours: 3600,
        day: 86400,
        days: 86400,
        week: 604800,
        weeks: 604800,
    };

    ngOnInit() {
        if (this.minDate || this.maxDate) {
            this.initDateLimitedModel();
        } else {
            this.initYearsLimitedModel();
        }

        setTimeout(() => this.cd.markForCheck(), 0);
    }

    updateDay(day: string) {
        this.model.updateDay(day);
        this.updateDate();
    }

    updateMonth(month: string) {
        this.model.updateMonth(month);
        this.updateDate();
    }

    updateYear(year: string) {
        this.model.updateYear(year);
        this.updateDate();
    }

    updateDate() {
        let currentDate: Date | undefined;

        if (this.model.selectedDay !== 0 && this.model.selectedMonth !== 0 && this.model.selectedYear !== 0) {
            currentDate = new Date(this.model.selectedYear, this.model.selectedMonth - 1, this.model.selectedDay);
        }

        const el = document.createElement('input');
        el.value = `${this.model.selectedYear}-${this.model.selectedMonth}-${this.model.selectedDay}`;
        el.name = this.ref.nativeElement.getAttribute('name') ?? '';
        this.dateUpdated.emit({
            originalTarget: this.ref.nativeElement,
            target: el,
            date: currentDate,
        });
    }

    private initDateLimitedModel() {
        let minDate = new Date();
        let maxDate = new Date();
        for (const minMax of ['min', 'max']) {
            const prop = (minMax + 'Date') as 'maxDate' | 'minDate';
            if (this[prop]) {
                const now = new Date();
                const matches = /([+-])(\d+)([a-z]+)/g.exec(`${this[prop]}`);

                if (matches) {
                    const amount = parseInt(matches[2], 10);
                    const units = matches[3];

                    if (typeof this.seconds[units] !== 'undefined') {
                        const milliSeconds = this.seconds[units] * amount * 1000;

                        // eslint-disable-next-line max-depth
                        if (matches[1] === '+') {
                            now.setTime(now.getTime() + milliSeconds);
                        } else {
                            now.setTime(now.getTime() - milliSeconds);
                        }
                    } else if (units === 'months') {
                        // eslint-disable-next-line max-depth
                        if (matches[1] === '+') {
                            now.setMonth(now.getMonth() + amount);
                        } else {
                            now.setMonth(now.getMonth() - amount);
                        }
                    } else if (units === 'years') {
                        // eslint-disable-next-line max-depth
                        if (matches[1] === '+') {
                            now.setFullYear(now.getFullYear() + amount);
                        } else {
                            now.setFullYear(now.getFullYear() - amount);
                        }
                    }

                    if (prop === 'minDate') {
                        minDate = now;
                    } else {
                        maxDate = now;
                    }
                }
            }
        }
        this.model = new MinMaxDateModel(this.day, this.month, this.year, minDate, maxDate);
    }

    private initYearsLimitedModel() {
        for (const minMax of ['min', 'max']) {
            const prop = (minMax + 'Year') as 'maxYear' | 'minYear';
            const matches = ['string', 'number'].includes(typeof this[prop]) ? /^([+-])(\d+)/.exec(`${this[prop]}`) : undefined;
            if (matches) {
                const addition = `${matches[1] === '+' ? matches[2] : +matches[2] * -1}`;
                this[prop] = new Date().getFullYear() + parseInt(addition, 10);
            }
        }
        if (this.value) {
            let value = this.value;
            if (typeof value === 'number' && isFinite(value)) {
                value = value * 1000; // microseconds
            }

            const date = new Date(value);
            if (isFinite(Number(date))) {
                this.day = date.getDate();
                this.month = date.getMonth() + 1;
                this.year = date.getFullYear();
                this.minYear = this.minYear < this.year ? this.minYear : this.year;
            }
        }

        this.model = new MinMaxYearModel(
            this.day,
            this.month,
            this.year,
            this.minYear,
            this.maxYear,
            this.yearOrder,
            this.restrictDateToYear,
        );
    }
}
