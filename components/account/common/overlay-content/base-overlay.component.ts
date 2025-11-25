import { Component, Output, EventEmitter, signal, computed } from '@angular/core';
import { GA4ElementCategories } from 'app/services/tracking/types';
import { RouteType } from 'routing/route-type';
import { BaseComponent } from 'app/components/base.component';
import { BaseOverlayContentData, OverlayButton, OverlayContentData } from 'app/components/common/overlay-content/types';

@Component({
    template: '',
})
export abstract class BaseOverlayComponent extends BaseComponent {
    trackCategory = computed<GA4ElementCategories>(
        () => this.data().trackCategory ?? (this.routeService.routeType() === RouteType.complete ? 'registration' : 'N/A'),
    );

    readonly data = signal<BaseOverlayContentData>({});
    readonly overlayData = computed(() => this.getDataDecorator(this.data()));

    @Output() onClose = new EventEmitter();

    close(afterClosed?: () => void) {
        this.overlayService.closeAll(afterClosed);
    }

    refresh() {
        this.cd.detectChanges();
    }

    protected getDataDecorator(data?: BaseOverlayContentData) {
        const result = { ...data } as OverlayContentData;
        result.trackCategory = this.trackCategory();
        if (data) {
            if (data.primaryBtn) {
                result.primaryBtn = this.getButtonDecorator(data.primaryBtn);
            }
            if (data.secondaryBtn) {
                result.secondaryBtn = this.getButtonDecorator(data.secondaryBtn);
            }
            if (data.linkBtn) {
                result.linkBtn = this.getButtonDecorator(data.linkBtn);
            }
            if (data.dangerBtn) {
                result.dangerBtn = this.getButtonDecorator(data.dangerBtn);
            }
            if (data.stickyBtn) {
                result.stickyBtn = this.getButtonDecorator(data.stickyBtn);
            }
            result.doOnClose = () =>
                this.close(() => {
                    data.doOnClose?.();
                    this.onClose.emit();
                });
        }

        return result;
    }

    private getButtonDecorator(button: OverlayButton) {
        return {
            ...button,
            action: () => {
                if (button.stayOpenOnClick) {
                    button.action?.();
                } else {
                    this.close(button.action);
                }
            },
        };
    }
}
