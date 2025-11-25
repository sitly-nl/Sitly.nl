import { Component, Input } from '@angular/core';
import { Nbsp } from 'app/pipes/nbsp.pipe';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'expandable-text',
    templateUrl: './expandable-text.component.html',
    styleUrls: ['./expandable-text.component.less'],
    standalone: true,
    imports: [TranslateModule, Nbsp],
})
export class ExpandableTextComponent {
    @Input({ required: true }) fullText: string;
    @Input({ required: true }) initialLength: number;

    expanded = false;

    get collapsedText() {
        if (!this.fullText) {
            return '';
        }

        return this.fullText.length <= this.initialLength ? this.fullText : this.fullText.substring(0, this.initialLength) + '.. ';
    }

    get showLink() {
        return !this.expanded && this.fullText?.length > this.initialLength;
    }
}
