import { Component, computed, ElementRef, inject, input } from '@angular/core';
import { ResponsiveButton } from 'app/components/common/overlay-content/types';

@Component({
    selector: '[responsive-buttons-container]',
    templateUrl: './responsive-buttons-container.component.html',
    styleUrl: './responsive-buttons-container.component.less',
})
export class ResponsiveButtonsContainerComponent {
    readonly singleButton = input(true);
    readonly data = input<ResponsiveButton[]>([]);
    readonly elementRef = inject(ElementRef);

    readonly buttons = computed(() => this.data().sort((a, b) => this.typesOrder[a.type] - this.typesOrder[b.type]));
    private readonly typesOrder = { danger: 0, primary: 1, secondary: 2, thirdly: 3 };
}
