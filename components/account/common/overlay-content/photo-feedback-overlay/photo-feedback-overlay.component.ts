import { inject, Component, EventEmitter, OnInit, Output } from '@angular/core';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { BaseOverlayComponent } from 'app/components/common/overlay-content/base-overlay.component';
import { AvatarCriticalErrorType, AvatarNonCriticalErrorType, PhotoUploadPurpose, UploadAvatarErrorInterface } from 'app/models/api/photo';
import { EventAction, EventCategory, PromptEvents } from 'app/services/tracking/types';
import { ImgSizeUtil } from 'app/utils/img-size-utils';
import { SharedModule } from 'modules/shared/shared.module';

@Component({
    selector: 'photo-feedback-overlay',
    templateUrl: './photo-feedback-overlay.component.html',
    styleUrls: ['./photo-feedback-overlay.component.less'],
    standalone: true,
    imports: [SharedModule, TranslateModule],
})
export class PhotoFeedbackOverlayComponent extends BaseOverlayComponent implements OnInit {
    readonly translateService = inject(TranslateService);

    @Output() newPhoto = new EventEmitter<PhotoUploadPurpose>();
    @Output() forceUpload = new EventEmitter<string>();

    get errorTitle() {
        if (!this.uploadError) {
            return 'photo-feedback.photoNotSuitable';
        }
        return this.hasCriticalError ? 'photo-feedback.photoNotSuitable' : 'photo-feedback.photoNotIdeal';
    }

    get errorText() {
        if (!this.uploadError) {
            return 'photo-feedback.pictureHasFilters';
        }
        return this._errorText;
    }

    get criticalError() {
        return this.uploadError?.meta?.mandatory;
    }

    get hasCriticalError() {
        return (this.criticalError?.length ?? 0) > 0;
    }

    get avatarUrl() {
        return ImgSizeUtil.transform(this.authUser?.links.avatar ?? '', '300');
    }

    avatarSrc?: string;
    avatarExamplesUrls: string[];
    uploadError?: UploadAvatarErrorInterface;

    private _errorText = '';

    ngOnInit() {
        this.avatarExamplesUrls = this.countrySettings?.avatarExamplesUrls ?? [];
        this.trackingService.trackEvent(EventCategory.prompts, EventAction.open, PromptEvents.avatarScreeningPrompt);

        this.translateService
            .get([
                'photo-feedback.avatarErrorNoFaces',
                'photo-feedback.avatarErrorMoreThanOneFace',
                'photo-feedback.avatarErrorSmallFace',
                'photo-feedback.avatarErrorCroppedFace',
                'photo-feedback.avatarErrorAngryFace',
                'photo-feedback.avatarErrorSunglasses',
                'photo-feedback.avatarErrorOverexposure',
                'photo-feedback.avatarErrorTextOverlay',
                'photo-feedback.avatarErrorDarkImage',
                'photo-feedback.avatarErrorFilterOverlay',
                'photo-feedback.avatarErrorExplicitContent',
                'main.and',
            ])
            .subscribe(translations => {
                setTimeout(() => {
                    this._errorText = this.calculateErrorTypes()
                        .map(type => this.getErrorTypeMessage(type, translations))
                        .aggregatedDescription(` ${translations['main.and']} `);
                    this.cd.markForCheck();
                }, 0);
                this.cd.markForCheck();
            });
    }

    onCloseClicked() {
        this.trackingService.trackPromptClickEvent(PromptEvents.avatarScreeningClose);
        this.close();
    }

    selectNewPhoto() {
        this.newPhoto.emit();
        this.trackingService.trackPromptClickEvent(PromptEvents.avatarScreeningChoseAnotherPhoto);
        this.close();
    }

    forceUploadPhoto() {
        this.forceUpload.emit();
        this.close();
    }

    private calculateErrorTypes() {
        const result: (AvatarCriticalErrorType | AvatarNonCriticalErrorType)[] = [];
        if (!this.uploadError) {
            return result;
        }

        if (this.uploadError.meta.mandatory) {
            for (const err of this.uploadError.meta.mandatory) {
                result.push(err);
            }
        }
        if (result.length >= 3) {
            return result;
        }

        if (this.uploadError.meta.optional) {
            for (const err of this.uploadError.meta.optional) {
                result.push(err);
                if (result.length === 3) {
                    return result;
                }
            }
        }

        return result;
    }

    private getErrorTypeMessage(errorType: AvatarCriticalErrorType | AvatarNonCriticalErrorType, translations: Record<string, string>) {
        switch (errorType) {
            case AvatarCriticalErrorType.noFaces:
                return translations['photo-feedback.avatarErrorNoFaces'];
            case AvatarCriticalErrorType.textOverlay:
                return translations['photo-feedback.avatarErrorTextOverlay'];
            case AvatarCriticalErrorType.sunglasses:
                return translations['photo-feedback.avatarErrorSunglasses'];
            case AvatarCriticalErrorType.croppedFace:
                return translations['photo-feedback.avatarErrorCroppedFace'];
            case AvatarNonCriticalErrorType.moreThanOneFace:
                return translations['photo-feedback.avatarErrorMoreThanOneFace'];
            case AvatarNonCriticalErrorType.smallFace:
                return translations['photo-feedback.avatarErrorSmallFace'];
            case AvatarNonCriticalErrorType.angryFace:
                return translations['photo-feedback.avatarErrorAngryFace'];
            case AvatarNonCriticalErrorType.explicitContent:
                return translations['photo-feedback.avatarErrorExplicitContent'];
            case AvatarNonCriticalErrorType.darkImage:
                return translations['photo-feedback.avatarErrorDarkImage'];
            case AvatarNonCriticalErrorType.overexposure:
            case AvatarNonCriticalErrorType.filterOverlay:
                return '--';
        }
    }
}
