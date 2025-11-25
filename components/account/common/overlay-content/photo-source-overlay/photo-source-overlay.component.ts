import { Component, Output, EventEmitter } from '@angular/core';
import { ImageLoaderService } from 'app/services/image-loader.service';
import { EventAction } from 'app/services/tracking/types';
import { Constants } from 'app/utils/constants';
import { BaseOverlayComponent } from 'app/components/common/overlay-content/base-overlay.component';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';

@Component({
    selector: 'photo-source-overlay',
    templateUrl: './photo-source-overlay.component.html',
    styleUrls: ['./photo-source-overlay.component.less'],
    standalone: true,
    imports: [SharedModule, TranslateModule],
})
export class PhotoSourceOverlayComponent extends BaseOverlayComponent {
    @Output() gallerySelected = new EventEmitter<string>();
    @Output() facebookSelected = new EventEmitter<string>();
    @Output() instagramSelected = new EventEmitter<string>();

    onOpenGalleryClicked() {
        this.trackingService.trackPhotoUploadEvent('photo-select_photogallery');
    }

    onPhotoSelected(event: Event) {
        this.trackingService.trackCtaEvent('select_myprofile-select_avatarscreen-select_photogallery', EventAction.myProfileMenu);
        const el = event.target as HTMLInputElement;
        if (!el.value) {
            return;
        }
        const imageLoader = new ImageLoaderService();
        imageLoader.loadPhoto(event, Constants.uploadImgMaxSize)?.subscribe(result => {
            setTimeout(() => {
                if (result.imgData) {
                    this.trackingService.trackPhotoUploadEvent('photo-select_photo-uploaded');
                }
                el.value = '';
                this.close(() => this.gallerySelected.emit(result.imgData ?? ''));
            }, 0);
        });
    }

    onInstagramSelected() {
        this.close(() => this.instagramSelected.emit());
    }

    onFacebookToken() {
        this.close(() => this.facebookSelected.emit());
    }
}
