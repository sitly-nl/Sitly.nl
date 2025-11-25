import { Component, Input } from '@angular/core';
import { GA4ElementAttr } from 'app/services/tracking/types';

@Component({
    selector: 'single-select-button',
    templateUrl: './single-select-button.component.html',
    styleUrls: ['./single-select-button.component.less'],
})
export class SingleSelectButtonComponent {
    @Input() selected = false;
    @Input({ required: true }) title: string;
    @Input() titleStyle: 'bold' | 'normal' = 'bold';
    @Input() subtitle?: string;
    @Input() iconLeft?: string;
    @Input() boldHeading?: string | number;
    @Input() rightIconType: 'selector' | 'edit' = 'selector';
    @Input() trackLabel?: GA4ElementAttr;
}
