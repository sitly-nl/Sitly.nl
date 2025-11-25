import { Component, computed, input } from '@angular/core';
import { OverlayContentData, ResponsiveButton } from 'app/components/common/overlay-content/types';

@Component({
    selector: 'overlay-template',
    templateUrl: './overlay-template.component.html',
    styleUrls: ['./overlay-template.component.less'],
})
export default class OverlayTemplateComponent {
    readonly data = input.required<OverlayContentData>();

    readonly hasButtons = computed(
        () => this.data().linkBtn || this.data().primaryBtn || this.data().secondaryBtn || this.data().dangerBtn,
    );

    readonly hasManyButtons = computed(
        () => [this.data().primaryBtn, this.data().secondaryBtn, this.data().dangerBtn].reduce((acc, item) => acc + (item ? 1 : 0), 0) > 1,
    );

    readonly buttons = computed(() => {
        const result: ResponsiveButton[] = [];

        const btnPrimary = this.data().primaryBtn;
        if (btnPrimary) {
            result.push({
                ...btnPrimary,
                trackLabel: {
                    category: this.data().trackCategory,
                    type: 'overlay',
                    description: 'primary-' + this.data().trackName,
                },
                type: 'primary',
            });
        }

        const btnSecondary = this.data().secondaryBtn;
        if (btnSecondary) {
            result.push({
                ...btnSecondary,
                trackLabel: {
                    category: this.data().trackCategory,
                    type: 'overlay',
                    description: 'secondary-' + this.data().trackName,
                },
                type: 'secondary',
            });
        }

        const btnDanger = this.data().dangerBtn;
        if (btnDanger) {
            result.push({
                ...btnDanger,
                trackLabel: {
                    category: this.data().trackCategory,
                    type: 'overlay',
                    description: 'danger-' + this.data().trackName,
                },
                type: 'danger',
            });
        }

        return result;
    });

    onHtmlClick(event: Event) {
        if (event.target instanceof HTMLAnchorElement) {
            if (new URL(event.target.href).host !== window.location.host) {
                event.stopPropagation();
                event.preventDefault();

                window.open(event.target.href, '_blank');
            }
        }
    }
}
