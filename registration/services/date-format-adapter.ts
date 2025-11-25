import { DatePipe } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { MAT_DATE_FORMATS, NativeDateAdapter } from '@angular/material/core';

@Injectable()
export class DateFormatAdapter extends NativeDateAdapter {
    private datePipe = new DatePipe(this.locale as never);
    private readonly dateFormats = inject(MAT_DATE_FORMATS);

    format(date: Date, displayFormat: object) {
        if (displayFormat === this.dateFormats.display.dateInput) {
            return this.datePipe.transform(date, 'dd/MM/yyyy') ?? '';
        }
        return super.format(date, displayFormat);
    }
}
