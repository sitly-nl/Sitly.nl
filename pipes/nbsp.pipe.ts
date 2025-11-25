import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'nbsp',
    standalone: true,
})
export class Nbsp implements PipeTransform {
    transform(value: string) {
        if (typeof value === 'string') {
            return (value + '').replace(/\s/g, '&nbsp;');
        }
        return value;
    }
}
