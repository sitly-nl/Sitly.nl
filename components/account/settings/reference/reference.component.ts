import { Reference } from 'app/models/api/reference';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'reference',
    templateUrl: 'reference.component.html',
    styleUrls: ['./reference.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
})
export class ReferenceComponent {
    @Input({ required: true }) reference: Reference;

    @Output() removingReference = new EventEmitter();
    @Output() editingReference = new EventEmitter();
}
