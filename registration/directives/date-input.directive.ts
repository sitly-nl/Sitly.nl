import { Directive, HostListener } from '@angular/core';

@Directive({
    selector: '[dateInput]',
    standalone: true,
})
export class DateInputDirective {
    @HostListener('focus', ['$event']) onFocus(event: Event) {
        (event.target as HTMLInputElement).blur();
    }
}
