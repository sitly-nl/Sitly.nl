import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'convertHourlyRate',
    standalone: true,
})
export class ConvertHourlyRate implements PipeTransform {
    transform(value?: string, _args?: unknown) {
        return value?.replace('-', '_');
    }
}
