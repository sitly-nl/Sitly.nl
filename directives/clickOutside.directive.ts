import { Directive, ElementRef, Output, EventEmitter, HostListener, inject } from '@angular/core';

@Directive({
    selector: '[clickOutside]',
})
export class ClickOutsideDirective {
    private elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

    @Output() clickOutside = new EventEmitter<HTMLElement>();

    @HostListener('document:click', ['$event.target'])
    onClick(targetElement: HTMLElement) {
        const clickedInside = this.elementRef.nativeElement.contains(targetElement);

        let clickedInsideMainMenu = false;
        const menuItem = document.getElementById('menu-items');
        if (menuItem) {
            clickedInsideMainMenu = menuItem.contains(targetElement);
        }

        if (!clickedInside && !clickedInsideMainMenu && targetElement.parentNode) {
            this.clickOutside.emit(targetElement);
        }
    }
}
