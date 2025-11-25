import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'nl2br',
    standalone: true,
})
export class Nl2br implements PipeTransform {
    transform(value: string) {
        if (typeof value === 'string') {
            return (value + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1<br>$2');
        }
        return value;
    }
}
