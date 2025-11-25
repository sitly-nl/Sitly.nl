import { inject, Component, EventEmitter, Output } from '@angular/core';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { PhotoUploadPurpose } from 'app/models/api/photo';
import { PhotoOverlayService } from 'app/services/overlay/photo-overlay.service';
import { RegistrationBaseComponent } from 'registration/components/registration-base.component';
import { SharedModule } from 'modules/shared/shared.module';

@Component({
    selector: 'registration-add-later',
    templateUrl: './registration-add-later.component.html',
    styleUrls: ['./registration-add-later.component.less'],
    standalone: true,
    imports: [SharedModule, TranslateModule],
})
export class RegistrationAddLaterComponent extends RegistrationBaseComponent {
    @Output() finish = new EventEmitter();

    readonly photoOverlayService = inject(PhotoOverlayService);
    readonly translateService = inject(TranslateService);

    titlePart1: string;
    titlePart2: string;

    ngOnInit() {
        const translationKey = this.authUser.isParent ? 'photo.addLaterOverlay.title.parent' : 'photo.addLaterOverlay.title.foster';
        this.translateService.get([translationKey]).subscribe(translations => {
            const parts = translations[translationKey].split('{{pct}}');
            this.titlePart1 = parts[0];
            this.titlePart2 = parts[1];
        });
    }

    onFinishClick() {
        this.finish.emit();
        this.dismiss();
    }

    onAddPhotoClick() {
        this.overlayService.closeAll(() => this.photoOverlayService.showPhotoSourceOverlay(PhotoUploadPurpose.photo));
    }

    dismiss() {
        this.overlayService.closeAll();
    }
}
