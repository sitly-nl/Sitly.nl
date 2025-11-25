import { Injectable, Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'ucfirst',
})
@Injectable({
    providedIn: 'root',
})
export class UcFirst implements PipeTransform {
    transform(value: string | null) {
        if (typeof value === 'string') {
            return value.charAt(0).toUpperCase() + value.slice(1);
        }
        return value ?? '';
    }
}
