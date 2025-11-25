import { inject, Component } from '@angular/core';
import { PhotoUploadPurpose } from 'app/models/api/photo';
import { RegistrationBaseComponent } from 'registration/components/registration-base.component';
import { PhotoOverlayService } from 'app/services/overlay/photo-overlay.service';
import { RegistrationAddLaterComponent } from 'registration/components/steps/shared/photo/add-later/registration-add-later.component';
import { TranslateModule } from '@ngx-translate/core';
import { PhotoEditorComponent } from 'modules/photo-editor/photo-editor.component';
import { SharedModule } from 'modules/shared/shared.module';
import { RegistrationPageContainerComponent } from 'registration/components/page-container/registration-page-container.component';

@Component({
    selector: 'registration-photo',
    templateUrl: './registration-photo.component.html',
    styleUrls: ['./registration-photo.component.less'],
    standalone: true,
    imports: [RegistrationPageContainerComponent, SharedModule, PhotoEditorComponent, TranslateModule],
})
export class RegistrationPhotoComponent extends RegistrationBaseComponent {
    private photoOverlayService = inject(PhotoOverlayService);

    get hasPhoto() {
        return this.authUser.photos.length > 0;
    }

    handleNextClick() {
        if (!this.hasPhoto) {
            this.photoOverlayService.showPhotoSourceOverlay(PhotoUploadPurpose.photo);
        } else {
            super.handleNextClick();
        }
    }

    onAddLaterClick() {
        const overlay = this.overlayService.openOverlay(RegistrationAddLaterComponent);
        overlay.finish.subscribe(() => {
            setTimeout(() => super.handleNextClick(), 0);
        });
    }
}
