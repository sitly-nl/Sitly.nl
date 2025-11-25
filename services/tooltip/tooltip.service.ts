import { ConnectedPosition, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { ElementRef, Injectable, inject } from '@angular/core';
import { TooltipComponent } from 'modules/shared/components/tooltip/tooltip.component';
import { Observable, Subscription } from 'rxjs';
import { OverlayService } from 'app/services/overlay/overlay.service';

export type TooltipAlignment = 'start' | 'end' | 'center';
export type TooltipPosition = 'top' | 'bottom' | 'right' | 'left';

export interface TooltipConfig {
    title: string;
    message: string;
    messageArgs?: Record<string, string>;
    button: {
        label: string;
        action?: () => void;
    };
    pointerAlign: TooltipAlignment;
    tooltipPosition: TooltipPosition;
    tooltipAlign: TooltipAlignment;
    onClose?: () => void;
}

@Injectable({
    providedIn: 'root',
})
export class TooltipService {
    get hasActiveTooltip() {
        return !!this.currentOverlayRef;
    }

    private readonly overlayService = inject(OverlayService);
    private readonly overlay = inject(Overlay);
    private currentOverlayRef?: OverlayRef;
    private positionSubscription?: Subscription;

    private readonly wheelScrollBlocker = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();

        return false;
    };

    showTooltip(
        config: TooltipConfig,
        anchorElement: ElementRef<HTMLElement>,
        highlightElement?: ElementRef<HTMLElement>,
        positionChanged?: Observable<void>,
    ) {
        if (this.currentOverlayRef || this.overlayService.hasActiveOverlay) {
            return false;
        }

        const position = this.overlay
            .position()
            .flexibleConnectedTo(anchorElement.nativeElement)
            .withPositions([this.getTooltipPosition(config.tooltipPosition, config.tooltipAlign)]);

        this.currentOverlayRef = this.overlay.create({
            hasBackdrop: false,
            positionStrategy: position,
            disposeOnNavigation: true,
        });
        this.currentOverlayRef?.outsidePointerEvents().subscribe(_ => {
            this.hideTooltip(config.onClose);
        });

        const componentPortal = new ComponentPortal(TooltipComponent);
        const componentRef = this.currentOverlayRef.attach(componentPortal);
        componentRef.instance.title = config.title;
        componentRef.instance.message = config.message;
        componentRef.instance.messageArgs = config.messageArgs;
        componentRef.instance.button = config.button.label;
        componentRef.instance.pointerPosition = config.tooltipPosition;
        componentRef.instance.pointerAlign = config.pointerAlign;
        componentRef.instance.action.subscribe(() => {
            config.button.action?.();
            this.hideTooltip(config.onClose);
        });
        componentRef.onDestroy(() => {
            this.clearState(highlightElement ?? anchorElement);
        });

        (highlightElement ?? anchorElement).nativeElement.classList.add('tooltip-host');
        window.document.querySelector('body')?.addEventListener('wheel', this.wheelScrollBlocker, { passive: false });

        this.positionSubscription = positionChanged?.subscribe(() => {
            this.currentOverlayRef?.updatePosition();
        });

        return true;
    }

    updatePosition() {
        this.currentOverlayRef?.updatePosition();
    }

    private hideTooltip(action?: () => void) {
        this.currentOverlayRef?.detach();
        action?.();
    }

    private clearState(highlightElement?: ElementRef<HTMLElement>) {
        this.currentOverlayRef = undefined;

        this.positionSubscription?.unsubscribe();
        this.positionSubscription = undefined;

        highlightElement?.nativeElement.classList.remove('tooltip-host');
        window.document.querySelector('body')?.removeEventListener('wheel', this.wheelScrollBlocker);
    }

    private getTooltipPosition(tooltipPosition: TooltipPosition = 'top', tooltipAlign: TooltipAlignment = 'center'): ConnectedPosition {
        switch (tooltipPosition) {
            case 'top':
                return {
                    originX: tooltipAlign,
                    originY: 'top',
                    overlayX: tooltipAlign,
                    overlayY: 'bottom',
                    offsetY: -12,
                };
            case 'bottom':
                return {
                    originX: tooltipAlign,
                    originY: 'bottom',
                    overlayX: tooltipAlign,
                    overlayY: 'top',
                    offsetY: 12,
                };
            case 'left':
                return {
                    originX: 'start',
                    originY: this.convertToPositionY(tooltipAlign),
                    overlayX: 'end',
                    overlayY: this.convertToPositionY(tooltipAlign),
                    offsetY: 0,
                    offsetX: -12,
                };
            case 'right':
                return {
                    originX: 'end',
                    originY: this.convertToPositionY(tooltipAlign),
                    overlayX: 'start',
                    overlayY: this.convertToPositionY(tooltipAlign),
                    offsetY: 0,
                    offsetX: 12,
                };
        }
    }

    private convertToPositionY(tooltipAlign: TooltipAlignment) {
        return tooltipAlign === 'end' ? 'bottom' : tooltipAlign === 'start' ? 'top' : 'center';
    }
}
