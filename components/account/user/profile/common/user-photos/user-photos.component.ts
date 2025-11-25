import { User } from 'app/models/api/user';
import { Component, ElementRef, EventEmitter, Input, Output, OnInit, ViewChild, ChangeDetectorRef, inject } from '@angular/core';
import { EnvironmentUtils } from 'app/utils/device-utils';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';

@Component({
    selector: 'user-photos',
    templateUrl: './user-photos.component.html',
    styleUrls: ['./user-photos.component.less'],
    standalone: true,
    imports: [SharedModule, TranslateModule],
})
export class UserPhotosComponent implements OnInit {
    readonly cd = inject(ChangeDetectorRef);

    images: string[];
    shownIndex = 0;
    readonly isDesktop = EnvironmentUtils.isDesktop;

    get scrollSnapContainer() {
        return this.scrollSnapContainerRef?.nativeElement;
    }
    get user() {
        return this._user;
    }
    @Input() set user(newValue: User) {
        this._user = newValue;

        this.images = [];
        if (newValue?.links.avatar && !newValue.photoAsAvatar) {
            this.images.push(`${newValue.links.avatar}`);
        }
        newValue.photos.forEach(element => {
            this.images.push(`${element.links.photo}`);
        });
    }
    @Input() showReportPhotoButton? = false;
    @Output() reportPhoto = new EventEmitter();

    @ViewChild('scrollSnapContainer', { static: false }) scrollSnapContainerRef?: ElementRef<HTMLDivElement>;

    private _user: User;

    ngOnInit() {
        setTimeout(() => {
            this.setupScrollSnap();
        }, 0);
    }

    onPrevious() {
        if (this.scrollSnapContainer && this.shownIndex > 0) {
            const scrollTo = this.scrollSnapContainer.childNodes[this.shownIndex - 1] as HTMLDivElement;
            this.scrollSnapContainer.scrollTo({ left: scrollTo.offsetLeft, behavior: 'smooth' });
        }
    }

    onNext() {
        if (this.scrollSnapContainer && this.shownIndex < this.scrollSnapContainer.childNodes.length - 2) {
            const scrollTo = this.scrollSnapContainer.childNodes[this.shownIndex + 1] as HTMLDivElement;
            this.scrollSnapContainer.scrollTo({ left: scrollTo.offsetLeft, behavior: 'smooth' });
        }
    }

    onReportPhoto() {
        this.reportPhoto.emit();
    }

    private setupScrollSnap() {
        this.scrollSnapContainerRef?.nativeElement.addEventListener('scroll', _ => {
            if (this.scrollSnapContainer) {
                const index = Math.round(this.scrollSnapContainer.scrollLeft / this.scrollSnapContainer.getBoundingClientRect().width);
                if (this.shownIndex !== index) {
                    this.shownIndex = index;
                    this.cd.markForCheck();
                }
            }
        });
    }
}
