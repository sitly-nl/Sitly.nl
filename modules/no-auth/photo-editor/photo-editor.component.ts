import { Component, Input, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { BaseComponent } from 'app/components/base.component';
import { StandardOverlayComponent } from 'app/components/common/overlay-content/standard-overlay/standard-overlay.component';
import { Photo, PhotoUploadPurpose } from 'app/models/api/photo';
import { PhotoService } from 'app/services/api/photo.service';
import { PhotoOverlayService } from 'app/services/overlay/photo-overlay.service';
import { GA4ElementCategories } from 'app/services/tracking/types';
import { SharedModule } from 'modules/shared/shared.module';
import { switchMap } from 'rxjs/operators';

@Component({
    standalone: true,
    selector: 'photo-editor',
    templateUrl: './photo-editor.component.html',
    styleUrls: ['./photo-editor.component.less'],
    imports: [SharedModule, TranslateModule],
})
export class PhotoEditorComponent extends BaseComponent {
    readonly photoService = inject(PhotoService);
    readonly photoOverlayService = inject(PhotoOverlayService);

    selectedPhoto?: Photo;
    @Input() trackCategory: GA4ElementCategories;

    get hasPhoto() {
        return this.authUser.photos.length > 0;
    }
    get selectedPhotoUrl() {
        return this.selectedPhoto?.links.photo;
    }

    ngOnInit() {
        this.selectedPhoto = this.authUser.photos[0];
        this.userService.changed.subscribe(() => {
            this.selectedPhoto = this.authUser.photos.find(photo => photo.id === this.selectedPhoto?.id) ?? this.authUser.photos[0];
            this.cd.markForCheck();
        });
    }

    showPhotoOverlay() {
        this.photoOverlayService.showPhotoSourceOverlay(PhotoUploadPurpose.photo);
    }

    showDeletePhotoOverlay(photoId: string) {
        this.overlayService.openOverlay(StandardOverlayComponent, {
            title: 'deletePhoto.title',
            message: `deletePhoto.message.${this.authUser.isParent ? 'parent' : 'foster'}`,
            primaryBtn: { title: 'deletePhoto.cta.keepPhoto' },
            secondaryBtn: { title: 'main.delete', action: () => this.deletePhoto(photoId) },
        });
    }

    usePhotoAsMain(photoId: string) {
        const order = [photoId, ...this.authUser.photos.filter(item => item.id !== photoId).map(item => item.id)];
        this.photoService
            .reorderPhotos(order)
            .pipe(switchMap(_ => this.userService.refreshAuthUser()))
            .subscribe();
    }

    private deletePhoto(photoId: string) {
        this.photoService
            .removePhoto(photoId)
            .pipe(switchMap(_ => this.userService.refreshAuthUser()))
            .subscribe();
    }
}
