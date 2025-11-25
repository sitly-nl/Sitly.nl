import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Injectable, inject } from '@angular/core';
import { PhotoService } from 'app/services/api/photo.service';
import { PhotoUploadPurpose, UploadAvatarErrorInterface } from 'app/models/api/photo';
import { RouteType } from 'routing/route-type';
import { LoaderComponent } from 'modules/shared/components/loader/loader.component';
import { finalize, switchMap } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { Error } from 'app/services/api/api.service';
import { OverlayService } from 'app/services/overlay/overlay.service';
import { PhotoFeedbackOverlayComponent } from 'app/components/common/overlay-content/photo-feedback-overlay/photo-feedback-overlay.component';
import { PhotoSourceOverlayComponent } from 'app/components/common/overlay-content/photo-source-overlay/photo-source-overlay.component';
import { UserService } from 'app/services/user.service';
import { TrackingService } from 'app/services/tracking/tracking.service';
import { NavigationService } from 'app/services/navigation.service';
import { StorageService } from 'app/services/storage.service';
import { StandardOverlayComponent } from 'app/components/common/overlay-content/standard-overlay/standard-overlay.component';
import { InstagramTokenService } from 'app/services/instagram/instagram-token.service';

@Injectable({
    providedIn: 'root',
})
export class PhotoOverlayService {
    private readonly photoService = inject(PhotoService);
    private readonly overlayService = inject(OverlayService);
    private readonly overlay = inject(Overlay);
    private readonly userService = inject(UserService);
    private readonly trackingService = inject(TrackingService);
    private readonly navigationService = inject(NavigationService);
    private readonly storageService = inject(StorageService);
    private readonly instagramTokenService = inject(InstagramTokenService);

    private get showUploadSuccess() {
        return this.storageService.showPhotoUploadSuccessOverlay;
    }

    private loaderOverlayRef?: OverlayRef;

    showPhotoSourceOverlay(purpose: PhotoUploadPurpose, showSuccessOverlay = false) {
        this.storageService.showPhotoUploadSuccessOverlay = showSuccessOverlay;
        const component = this.overlayService.openOverlay(PhotoSourceOverlayComponent, {
            doOnClose: () => this.resetSuccessOverlay(),
        });
        component.gallerySelected.subscribe(result => {
            this.showPhotoCropper(result, purpose);
        });
        component.facebookSelected.subscribe(() => this.onFacebookPhotoRequested(purpose));
        component.instagramSelected.subscribe(() => this.onInstagramPhotoRequested(purpose));
    }

    onWebPhotoSelected(url: string, purpose: PhotoUploadPurpose) {
        this.showPhotoCropper(url, purpose);
        this.trackingService.trackPhotoUploadEvent('photo-select_photo-uploaded');
    }

    showPhotoFeedbackOverlay(uploadPurpose: PhotoUploadPurpose, error?: UploadAvatarErrorInterface, src?: string) {
        const overlay = this.overlayService.openOverlay(PhotoFeedbackOverlayComponent);
        overlay.uploadError = error;
        overlay.avatarSrc = src;
        overlay.newPhoto.subscribe(() =>
            this.overlayService.closeAll(() => this.showPhotoSourceOverlay(uploadPurpose, this.showUploadSuccess)),
        );
        if (src) {
            overlay.forceUpload.subscribe(() => this.onForceUpload(src, uploadPurpose));
        }
    }

    private onInstagramPhotoRequested(purpose: PhotoUploadPurpose) {
        if (this.instagramTokenService.igAccessToken) {
            this.navigationService.navigate(RouteType.instagramPhotos, { purpose });
        } else {
            this.instagramTokenService.login(this.navigationService.createUrlTree(RouteType.instagramPhotos, { purpose }).toString());
        }
    }

    private onFacebookPhotoRequested(purpose: PhotoUploadPurpose) {
        this.trackingService.trackPhotoUploadEvent('photo-select_facebook');
        this.navigationService.navigate(RouteType.facebookPhotos, { purpose });
    }

    private async showPhotoCropper(src: string, purpose: PhotoUploadPurpose) {
        const overlayRef = this.overlay.create({
            hasBackdrop: false,
            panelClass: 'croppie-overlay',
        });
        const component = new ComponentPortal(
            (await import('app/components/common/overlay-content/photo-cropper-overlay/photo-cropper-overlay.component')).default,
        );
        const componentRef = overlayRef.attach(component);
        componentRef.instance.croppedImage.subscribe(result => {
            this.handleCroppedImage(result, purpose);
            overlayRef.detach();
        });
        componentRef.instance.close.subscribe(() => {
            this.resetSuccessOverlay();
            overlayRef.detach();
        });
        setTimeout(() => componentRef.instance.setImage(src), 0);
    }

    private showLoader() {
        this.loaderOverlayRef = this.overlay.create({
            hasBackdrop: false,
        });
        const component = new ComponentPortal(LoaderComponent);
        this.loaderOverlayRef.attach(component);
    }

    private hideLoader() {
        this.loaderOverlayRef?.detach();
        this.loaderOverlayRef = undefined;
    }

    private onForceUpload(src: string, photoPurpose: PhotoUploadPurpose) {
        if (photoPurpose === PhotoUploadPurpose.avatar) {
            this.uploadAvatar(src, false);
        } else {
            this.uploadPhoto(src, false);
        }
    }

    private handleCroppedImage(result: string, photoPurpose: PhotoUploadPurpose) {
        const imageSrc = result.replace(/data:image.*base64,/, '');
        if (photoPurpose === PhotoUploadPurpose.avatar) {
            this.uploadAvatar(imageSrc, !this.userService.authUser?.isParent);
        } else {
            this.uploadPhoto(imageSrc, !this.userService.authUser?.isParent);
        }
    }

    private uploadAvatar(imageSrc: string, validate = false) {
        this.showLoader();

        const previousNumberOfPhotos = this.userService.authUser?.totalNumberOfPhotos ?? 0;
        this.userService
            .uploadAvatar(imageSrc, validate)
            .pipe(finalize(() => this.hideLoader()))
            .subscribe(
                response => {
                    this.userService.authUser = response.data;
                    this.trackingService.trackPhotoUploadEvent('photo-select_photo-uploaded_continue-photo_uploaded');
                    this.trackingService.trackPhotoUploadGA4Event(
                        previousNumberOfPhotos,
                        this.userService.authUser.totalNumberOfPhotos ?? 0,
                    );
                },
                (err: HttpErrorResponse) => {
                    this.onAvatarUploadFail(err, imageSrc, PhotoUploadPurpose.avatar);
                },
            );
    }

    private uploadPhoto(imageSrc: string, validate: boolean) {
        this.showLoader();

        const previousNumberOfPhotos = this.userService.authUser?.totalNumberOfPhotos ?? 0;
        this.photoService
            .uploadPhoto(imageSrc, validate)
            .pipe(
                switchMap(_ => this.userService.refreshAuthUser()),
                finalize(() => this.hideLoader()),
            )
            .subscribe(
                _ => {
                    this.trackingService.trackPhotoUploadEvent('photo-select_photo-uploaded_continue-photo_uploaded');
                    this.trackingService.trackPhotoUploadGA4Event(
                        previousNumberOfPhotos,
                        this.userService.authUser?.totalNumberOfPhotos ?? 0,
                    );
                    if (this.showUploadSuccess) {
                        this.overlayService.openOverlay(StandardOverlayComponent, {
                            title: 'photoSavedOverlay.title',
                            message: 'photoSavedOverlay.message',
                            primaryBtn: { title: 'main.close' },
                            img: { name: 'illustrations/sitter-photo-update', type: 'svg' },
                        });
                    }
                    this.resetSuccessOverlay();
                },
                (err: HttpErrorResponse) => {
                    this.onAvatarUploadFail(err, imageSrc, PhotoUploadPurpose.photo);
                },
            );
    }

    private resetSuccessOverlay() {
        this.storageService.showPhotoUploadSuccessOverlay = false;
    }

    private onAvatarUploadFail(err: Error<UploadAvatarErrorInterface>, src: string, purpose: PhotoUploadPurpose) {
        const errors = err.error?.errors;
        if (!errors || errors?.length < 0) {
            return;
        }

        const avatarError = errors[0];

        const hasCriticalError = avatarError.meta?.mandatory?.length > 0;
        const hasNonCriticalError = avatarError.meta?.optional?.length > 0;
        if (hasCriticalError || hasNonCriticalError) {
            this.showPhotoFeedbackOverlay(purpose, avatarError, src);
        } else {
            // DO NOTHING
        }
    }
}
