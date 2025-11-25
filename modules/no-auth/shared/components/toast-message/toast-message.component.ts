import { animate, animateChild, query, state, style, transition, trigger } from '@angular/animations';
import { Component, Input } from '@angular/core';
import { EnvironmentUtils } from 'app/utils/device-utils';

const triggerChildAnimation = trigger('triggerChildAnimation', [
    transition(':enter, :leave', [animate('0s'), query('*', [animateChild()])]),
]);

const verticalCollapseAnimation = trigger('verticalCollapse', [
    state(
        '*',
        style({
            height: '*',
        }),
    ),
    state(
        'void',
        style({
            height: '0',
        }),
    ),
    transition('* => void', animate('.3s .3s ease')),
]);

@Component({
    selector: 'toast-message',
    templateUrl: './toast-message.component.html',
    styleUrls: ['./toast-message.component.less'],
    animations: [
        trigger('fadeInOut', [
            transition('void => shown', [
                style({
                    transform: 'translateY(20px) scale(1.1) rotateY(5deg)',
                    opacity: 0,
                    filter: 'blur(2px) saturate(50%)',
                }),
                animate(
                    300,
                    style({
                        transform: 'translateY(0) scale(1) rotateY(0)',
                        opacity: 1,
                        filter: 'blur(0) saturate(100%)',
                    }),
                ),
            ]),
            transition('shown => void', [
                animate(
                    300,
                    style({
                        transform: 'translateY(70px) scale(0.7)',
                        opacity: 0,
                        filter: 'blur(2px) saturate(50%)',
                    }),
                ),
            ]),
        ]),
        trigger('slideUpDown', [
            transition('void => shown', [style({ transform: 'translateY(164px)' }), animate(300, style({ transform: 'translateY(0)' }))]),
            transition('shown => void', [animate(300, style({ transform: 'translateY(164px)' }))]),
        ]),
        verticalCollapseAnimation,
        triggerChildAnimation,
    ],
})
export class ToastMessageComponent {
    @Input() icon = 'info-icon';
    @Input() message: string[] | string;

    get messages() {
        return typeof this.message === 'string' ? [this.message] : this.message;
    }
    readonly isDesktop = EnvironmentUtils.isDesktop;
}
