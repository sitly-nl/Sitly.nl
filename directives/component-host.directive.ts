import { Directive, ViewContainerRef, inject } from '@angular/core';

@Directive({
    selector: '[component-host]',
    standalone: true,
})
export class ComponentHostDirective {
    viewContainerRef = inject(ViewContainerRef);
}
