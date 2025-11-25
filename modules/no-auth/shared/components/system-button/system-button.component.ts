import { Component, Input } from '@angular/core';

@Component({
    selector: 'system-button',
    templateUrl: './system-button.component.html',
    styleUrls: ['./system-button.component.less'],
})
export class SystemButtonComponent {
    @Input() loading = false;
    @Input() disabled = false;
    @Input() buttonType: 'primary-small' | 'primary' | 'secondary-small' | 'secondary' | 'thirdly-small' | 'thirdly' | 'danger' = 'primary';
    @Input() iconLeft?: string;
    @Input() iconRight?: string;

    get isSmall() {
        return this.buttonType.endsWith('-small');
    }
    get mainClassName() {
        return this.buttonType.split('-')[0];
    }
}
