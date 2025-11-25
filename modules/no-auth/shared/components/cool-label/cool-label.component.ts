import { Component, Input } from '@angular/core';

@Component({
    selector: 'cool-label',
    templateUrl: 'cool-label.component.html',
    styleUrls: ['cool-label.component.less'],
})
export class CoolLabelComponent {
    @Input() text = '';
    @Input() color: 'purple' | 'blue' = 'purple';
    @Input() size: 'large' | 'small' = 'small';

    get labelStyle() {
        return [this.color, this.size];
    }
}
