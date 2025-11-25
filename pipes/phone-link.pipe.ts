import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'phoneLink',
    standalone: true,
})
export class PhoneLinkPipe implements PipeTransform {
    transform(value: string) {
        const pattern = /\+?([0-9()]+[\s-]?)+/g;
        const htmlText = value.replace(pattern, match => {
            const phoneNumber = match.replace(/[ ()-]/g, '');
            if (phoneNumber.length < 7) {
                return match;
            }
            return `<a href="tel:${phoneNumber}">${match}</a>`;
        });
        return htmlText;
    }
}
