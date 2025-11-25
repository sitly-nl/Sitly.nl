import { animate, style, transition, trigger } from '@angular/animations';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TooltipAlignment, TooltipPosition } from 'app/services/tooltip/tooltip.service';

@Component({
    selector: 'tooltip',
    templateUrl: './tooltip.component.html',
    styleUrl: './tooltip.component.less',
    animations: [
        trigger('enterAnimation', [
            transition(':enter', [
                style({
                    opacity: 0,
                }),
                animate(
                    '0.25s 0.2s ease-in-out',
                    style({
                        opacity: 1,
                    }),
                ),
            ]),
        ]),
        trigger('leaveAnimation', [
            transition(':leave', [
                style({
                    opacity: 1,
                }),
                animate(
                    '0.25s 0.2s ease-in-out',
                    style({
                        opacity: 0,
                    }),
                ),
            ]),
        ]),
    ],
})
export class TooltipComponent {
    @Input() pointerAlign: TooltipAlignment = 'center';
    @Input() pointerPosition: TooltipPosition = 'top';
    @Input() title?: string;
    @Input() message?: string;
    @Input() messageArgs?: Record<string, string>;
    @Input() button?: string;
    @Output() action = new EventEmitter();
}
