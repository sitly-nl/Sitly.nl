import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'std',
})
export class StringToDate implements PipeTransform {
    transform(input: string) {
        return new Date(input);
    }
}
