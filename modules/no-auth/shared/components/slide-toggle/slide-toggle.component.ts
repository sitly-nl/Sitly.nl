import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
    selector: 'slide-toggle',
    templateUrl: './slide-toggle.component.html',
    styleUrls: ['./slide-toggle.component.less'],
})
export class SlideToggleComponent {
    @Input() checked = false;
    @Output() checkedChange = new EventEmitter<boolean>();
}
