import { inject } from '@angular/core';
import { DeleteWinbackComponent } from 'app/components/account/delete-winback/delete-winback.component';
import { PremiumWinbackComponent } from 'app/components/account/premium-winback/premium-winback.component';
import { AvailabilityOverlayComponent } from 'app/components/common/overlay-content/availability-overlay/availability-overlay.component';
import { OverlayService } from 'app/services/overlay/overlay.service';
import { CommonOverlayService } from 'app/services/overlay/common-overlay.service';
import { InvoicesComponent } from 'app/components/account/invoices/invoices.component';
import { PhotoFeedbackOverlayComponent } from 'app/components/common/overlay-content/photo-feedback-overlay/photo-feedback-overlay.component';
import { PhotoSourceOverlayComponent } from 'app/components/common/overlay-content/photo-source-overlay/photo-source-overlay.component';
import { ReportOverlayComponent } from 'app/components/common/report-overlay/report-overlay.component';
import { User } from 'app/models/api/user';

export class OverlayTestService {
    private readonly overlayService = inject(OverlayService);
    private readonly commonOverlayService = inject(CommonOverlayService);

    showPremiumWinback() {
        this.overlayService.openOverlay(PremiumWinbackComponent);
    }

    showDeleteWinback() {
        this.overlayService.openOverlay(DeleteWinbackComponent);
    }

    showAvailabilityOverlay() {
        this.overlayService.openOverlay(AvailabilityOverlayComponent);
    }

    showWelcomeOverlay() {
        this.commonOverlayService.openWelcomeOverlay();
    }

    showInvoicesOverlay() {
        this.overlayService.openOverlay(InvoicesComponent);
    }

    showNonResponseVictimOverlay() {
        this.commonOverlayService.showNonResponseVictimOverlay();
    }

    showPhotoFeedbackOverlay() {
        this.overlayService.openOverlay(PhotoFeedbackOverlayComponent);
    }

    showPhotoSourceOverlay() {
        this.overlayService.openOverlay(PhotoSourceOverlayComponent);
    }

    showReportOverlay() {
        const overlay = this.overlayService.openOverlay(ReportOverlayComponent);
        const user = new User();
        user.firstName = 'Cypress';
        overlay.user = user;
    }

    showEditReferenceOverlay() {
        this.commonOverlayService.showEditReferenceOverlay();
    }

    showInvitesNextStepsOverlay() {
        this.commonOverlayService.showInvitesNextStepsOverlay();
    }

    closeAll() {
        this.overlayService.closeAll();
    }
}
