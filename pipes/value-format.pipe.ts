import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'valueFormat',
    pure: false,
    standalone: true,
})
export class ValueFormat implements PipeTransform {
    private defaultLocale: string;

    transform(value: number) {
        if (typeof value !== 'number') {
            value = Number(value);
        }
        if (typeof value === 'number') {
            return value.toLocaleString(this.defaultLocale, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
        }
        return '';
    }
}
