import { Directive, ElementRef, Input, inject } from '@angular/core';
import { User } from 'app/models/api/user';
import { ImgSizeUtil } from 'app/utils/img-size-utils';

@Directive({
    selector: '[avatar]',
})
export class AvatarDirective {
    @Input() size = 60;
    @Input() user?: User;
    @Input() url?: string;
    @Input() hidePhotoAsAvatar = false;

    private element = inject<ElementRef<HTMLImageElement>>(ElementRef);

    ngOnChanges() {
        if (!this.user && !this.url) {
            return;
        }

        this.element.nativeElement.parentElement?.classList.add('gradient');

        const url = this.user?.links?.avatar ?? this.url;
        if (url && !this.hidePhotoAsAvatar) {
            const eventListener = (_err: unknown) => {
                this.element.nativeElement.removeEventListener('error', eventListener);
                this.setDefaultAvatar();
            };
            this.element.nativeElement.addEventListener('error', eventListener);
            this.element.nativeElement.src = ImgSizeUtil.transform(url, this.size, true);
            this.element.nativeElement.srcset = '';
        } else {
            this.setDefaultAvatar();
        }
    }

    private setDefaultAvatar() {
        this.element.nativeElement.parentElement?.classList.remove('gradient');
        if (this.user) {
            this.element.nativeElement.src = this.user.defaultAvatar;
        }
    }
}
