import { Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { BaseComponent } from 'app/components/base.component';
import { SharedModule } from 'modules/shared/shared.module';
import { PhotoUploadPurpose } from 'app/models/api/photo';
import { EventAction } from 'app/services/tracking/types';
import { PhotoService } from 'app/services/api/photo.service';
import { PhotoOverlayService } from 'app/services/overlay/photo-overlay.service';

@Component({
    standalone: true,
    selector: 'photo-editor-old',
    templateUrl: './photo-editor-old.component.html',
    styleUrls: ['./photo-editor-old.component.less'],
    imports: [SharedModule, TranslateModule],
})
export class PhotoEditorOldComponent extends BaseComponent {
    PhotoUploadPurpose = PhotoUploadPurpose;

    get photos() {
        return this.authUser.photos;
    }

    private photoService = inject(PhotoService);
    private photoOverlayService = inject(PhotoOverlayService);

    onPhotoRequested(event: Event, purpose: PhotoUploadPurpose) {
        this.trackCtaEvent(
            purpose === PhotoUploadPurpose.avatar ? 'select_myprofile-select_avatarscreen' : 'select_myprofile-select_additionalphoto',
            EventAction.myProfileMenu,
            true,
            false,
        );
        this.trackingService.trackPhotoUploadEvent('photo-select');
        event.preventDefault();
        this.photoOverlayService.showPhotoSourceOverlay(purpose);
    }

    removePhoto(photoId: string) {
        const index = this.authUser.photos.findIndex(item => {
            return item.id === photoId;
        });
        if (index >= 0) {
            this.authUser.photos.splice(index, 1);
        }

        this.photoService.removePhoto(photoId).subscribe((_: unknown) => {
            this.userService.refreshAuthUser().subscribe();
        });
    }
}
