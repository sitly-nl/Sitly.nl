import { Injectable } from '@angular/core';
import { StandardOverlayComponent } from 'app/components/common/overlay-content/standard-overlay/standard-overlay.component';
import { OverlayService } from 'app/services/overlay/overlay.service';

@Injectable()
export class RegistrationOverlayService extends OverlayService {
    showExitRegistrationAlert(action: () => void) {
        this.openOverlay(StandardOverlayComponent, {
            title: 'alert.exit.title',
            message: 'alert.exit.message',
            primaryBtn: { title: 'main.continue' },
            secondaryBtn: { title: 'alert.exit.cta.exit', action },
            trackName: 'exit-alert',
        });
    }
}
