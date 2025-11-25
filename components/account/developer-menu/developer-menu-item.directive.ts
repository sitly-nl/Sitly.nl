import { Directive, EventEmitter, HostListener, Output } from '@angular/core';

@Directive({
    selector: '[dev-menu-item]',
    standalone: true,
})
export class DeveloperMenuItemDirective {
    @Output() selected = new EventEmitter<Event | KeyboardEvent>();

    @HostListener('keyup', ['$event'])
    onKeyUp(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            this.selected.emit(event);
        }
    }

    @HostListener('click', ['$event'])
    onItemClick(event: Event) {
        this.selected.emit(event);
    }
}
