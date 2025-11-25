import { Component, Output, EventEmitter, ViewChild, ElementRef, OnInit, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouteType } from 'routing/route-type';
import { TrackingService } from 'app/services/tracking/tracking.service';
import { GA4ElementCategories } from 'app/services/tracking/types';
import { EnvironmentUtils } from 'app/utils/device-utils';
import Croppie from 'croppie';
import { SharedModule } from 'modules/shared/shared.module';
import { RouteService } from 'app/services/route.service';

const MAX_UPLOAD_IMG_SIZE = 1500;

const TOP_TEXT_CONTAINER_HEIGHT = 224;
const BOTTOM_CONTAINER_HEIGHT = 168;
const MAX_VIEWPORT_SIZE = 495;
const MOBILE_SIDE_MARGIN = 20;

@Component({
    standalone: true,
    selector: 'photo-cropper-overlay',
    templateUrl: './photo-cropper-overlay.component.html',
    styleUrls: ['./photo-cropper-overlay.component.less'],
    imports: [SharedModule, TranslateModule],
})
export default class PhotoCropperOverlayComponent implements OnInit {
    readonly trackingService = inject(TrackingService);
    readonly routeService = inject(RouteService);

    @ViewChild('cropperWindow', { static: true }) cropperWindowRef: ElementRef<HTMLDivElement>;
    @ViewChild('rotate', { static: true }) btnRotateRef: ElementRef<HTMLButtonElement>;
    @ViewChild('spacer', { static: true }) spacerRef: ElementRef<HTMLDivElement>;

    @Output() croppedImage = new EventEmitter<string>();
    @Output() close = new EventEmitter();

    trackCategory: GA4ElementCategories = 'N/A';

    readonly isDesktop = EnvironmentUtils.isDesktop;

    private cropper?: Croppie;
    private imgData?: string;
    private orientation = 1;

    ngOnInit() {
        if (this.cropperWindowRef.nativeElement) {
            const viewportSize = this.isDesktop()
                ? Math.min(Math.max(window.innerHeight - TOP_TEXT_CONTAINER_HEIGHT - BOTTOM_CONTAINER_HEIGHT, 0), MAX_VIEWPORT_SIZE)
                : window.innerWidth - 2 * MOBILE_SIDE_MARGIN;
            const options = {
                viewport: {
                    width: viewportSize,
                    height: viewportSize,
                },
                showZoomer: this.isDesktop(),
                enableExif: false,
                enableOrientation: true,
            };
            this.cropper = new Croppie(this.cropperWindowRef.nativeElement, options);

            if (this.isDesktop()) {
                this.spacerRef.nativeElement.style.height = `${viewportSize}px`;
            }
        }
        this.trackCategory = this.routeService.routeType() === RouteType.complete ? 'registration' : 'N/A';
    }

    setImage(src: string) {
        this.imgData = src;
        this.cropper?.bind({
            url: src,
            zoom: 0,
        });
    }

    rotatePhoto() {
        this.trackingService.trackPhotoUploadEvent('photo-select_photo-uploaded_photo-rotate');
        const lastZoom = this.cropper?.get().zoom ?? 0;
        if (this.imgData?.startsWith('data:image/jpeg;base64')) {
            // image in base64
            this.imgData = this.rotateBase64Image90deg(this.imgData, true);
        } else {
            // image by url
            if (this.orientation === 1) {
                this.orientation = 6; // rotated 90 degrees clockwise
            } else if (this.orientation === 6) {
                this.orientation = 3; // rotated 180 degrees
            } else if (this.orientation === 3) {
                this.orientation = 8; // rotated 90 degrees counter-clockwise
            } else {
                this.orientation = 1; // initial orientation
            }
        }

        this.cropper?.bind({
            url: this.imgData ?? '',
            orientation: this.orientation,
            zoom: lastZoom,
        });
    }

    async submitImage() {
        const result = await this.cropper?.result({
            type: 'base64',
            size: { width: MAX_UPLOAD_IMG_SIZE, height: MAX_UPLOAD_IMG_SIZE },
            format: 'jpeg',
            quality: 0.8,
        });
        this.croppedImage.emit(result);
    }

    private rotateBase64Image90deg(base64Image: string, isClockwise: boolean) {
        // create an off-screen canvas
        const offScreenCanvas = window.document.createElement('canvas');
        const offScreenCanvasCtx = offScreenCanvas.getContext('2d');

        // create Image
        const img = new Image();
        img.src = base64Image;

        // set its dimension to rotated size
        offScreenCanvas.height = img.width;
        offScreenCanvas.width = img.height;

        // rotate and draw source image into the off-screen canvas:
        if (isClockwise) {
            offScreenCanvasCtx?.rotate((90 * Math.PI) / 180);
            offScreenCanvasCtx?.translate(0, -offScreenCanvas.width);
        } else {
            offScreenCanvasCtx?.rotate((-90 * Math.PI) / 180);
            offScreenCanvasCtx?.translate(-offScreenCanvas.height, 0);
        }
        offScreenCanvasCtx?.drawImage(img, 0, 0);

        // encode image to data-uri with base64
        return offScreenCanvas.toDataURL('image/jpeg', 100);
    }
}
