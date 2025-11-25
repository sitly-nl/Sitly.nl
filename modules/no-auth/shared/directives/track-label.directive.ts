import { Directive, ElementRef, Input, HostListener, OnInit, Renderer2, inject } from '@angular/core';
import { GA4ElementAttr } from 'app/services/tracking/types';
@Directive({
    selector: '[trackLabel]',
})
export class TrackLabelDirective implements OnInit {
    private element = inject(ElementRef);
    private renderer = inject(Renderer2);

    @Input() trackLabel: GA4ElementAttr | undefined;
    private changing = false;
    ngOnInit() {
        this.init();
    }

    init() {
        if (this.changing || !this.trackLabel) {
            return;
        }
        this.changing = true;
        const element = this.element.nativeElement as HTMLElement;
        const tagName = element.tagName.toLowerCase();
        const label = TrackLabelDirective.createTrackLabel(this.trackLabel);

        switch (true) {
            case tagName.startsWith('mat-button'):
            case tagName.startsWith('system-button'):
            case tagName.startsWith('single-select-button'):
                this.renderer.setAttribute(element.firstChild, 'data-track-label', label);
                break;
            case tagName.startsWith('slide-toggle'):
                this.renderer.setAttribute(element.firstChild?.firstChild, 'data-track-label', label);
                break;
            default:
                this.renderer.setAttribute(element, 'data-track-label', label);
        }
        this.changing = false;
    }

    static createTrackLabel({ category, type, description, value }: GA4ElementAttr) {
        return `${category}_${type}_${description}${value ? `_${value}` : ''}`;
    }

    @HostListener('change') onChange() {
        this.init();
    }

    @HostListener('click') onClick() {
        this.init();
    }
}
