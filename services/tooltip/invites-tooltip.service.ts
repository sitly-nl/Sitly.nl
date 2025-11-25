import { ElementRef, Injectable, inject } from '@angular/core';
import { TooltipPosition, TooltipService } from 'app/services/tooltip/tooltip.service';
import { StorageService } from 'app/services/storage.service';
import { UserService } from 'app/services/user.service';
import { FeatureService } from 'app/services/feature.service';
import { Observable } from 'rxjs';
import { EnvironmentUtils } from 'app/utils/device-utils';
import { OverlayService } from 'app/services/overlay/overlay.service';
import { RouteService } from 'app/services/route.service';

@Injectable({
    providedIn: 'root',
})
export class InvitesTooltipService {
    private readonly tooltipService = inject(TooltipService);
    private readonly storageService = inject(StorageService);
    private readonly userService = inject(UserService);
    private readonly featureService = inject(FeatureService);
    private readonly overlayService = inject(OverlayService);
    private readonly routeService = inject(RouteService);

    showParentInvitesTooltipIfNeeded(
        tooltipPosition: TooltipPosition,
        anchorElement?: ElementRef<HTMLElement>,
        highlightElement?: ElementRef<HTMLElement>,
        positionChanged?: Observable<void>,
    ) {
        if (
            !anchorElement ||
            !this.featureService.invitesEnabled ||
            this.storageService.invitesTooltipShown ||
            !this.userService.authUser?.isParent ||
            this.overlayService.hasActiveOverlay ||
            this.routeService.hasModalRoute()
        ) {
            return;
        }

        this.storageService.invitesTooltipShown = this.tooltipService.showTooltip(
            {
                title: 'invitesTooltip.parent.title',
                message: 'invitesTooltip.parent.message',
                button: { label: 'main.gotIt' },
                tooltipPosition,
                tooltipAlign: 'center',
                pointerAlign: 'center',
            },
            anchorElement,
            highlightElement,
            positionChanged,
        );
    }

    showSitterTooltipIfNeeded(anchorElement?: ElementRef<HTMLElement>, highlightElement?: ElementRef<HTMLElement>) {
        if (
            !anchorElement ||
            !this.featureService.invitesEnabled ||
            this.storageService.invitesTooltipShown ||
            this.userService.authUser?.isParent
        ) {
            return;
        }

        this.storageService.invitesTooltipShown = this.tooltipService.showTooltip(
            {
                title: 'invitesTooltip.sitter.title',
                message: 'invitesTooltip.sitter.message',
                button: { label: 'main.gotIt' },
                tooltipPosition: EnvironmentUtils.isDesktop() ? 'bottom' : 'top',
                tooltipAlign: !this.userService.authUser?.isPremium || EnvironmentUtils.isDesktop() ? 'center' : 'start',
                pointerAlign: EnvironmentUtils.isDesktop() || !this.userService.authUser?.isPremium ? 'center' : 'start',
            },
            anchorElement,
            highlightElement,
        );
    }
}
