import { Component, OnInit, ViewChild, ElementRef, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PhotoUploadPurpose } from 'app/models/api/photo';
import { InstagramGraphService, InstagramMedia } from 'app/services/instagram/instagram-graph.service';
import { takeUntil, finalize } from 'rxjs/operators';
import { BaseComponent } from 'app/components/base.component';
import { InstagramTokenService } from 'app/services/instagram/instagram-token.service';
import { PhotoOverlayService } from 'app/services/overlay/photo-overlay.service';
import { InfiniteScrollDirective } from 'ngx-infinite-scroll';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    standalone: true,
    selector: 'instagram-photos',
    templateUrl: './instagram-photos.component.html',
    styleUrls: ['./instagram-photos.component.less'],
    imports: [InfiniteScrollDirective, TranslateModule],
})
export default class InstagramPhotosComponent extends BaseComponent implements OnInit {
    readonly route = inject(ActivatedRoute);
    readonly instagramTokenService = inject(InstagramTokenService);
    readonly instagramGraphService = inject(InstagramGraphService);
    readonly photoOverlayService = inject(PhotoOverlayService);

    @ViewChild('instagram-container', { static: false }) igContainer?: ElementRef<HTMLDivElement>;
    @ViewChild('media-container', { static: false }) mediaGrid?: ElementRef<HTMLDivElement>;
    @ViewChild('instagram-toolbar', { static: false }) toolbar?: ElementRef<HTMLDivElement>;

    media: InstagramMedia[] = [];
    selectedMedia?: InstagramMedia;
    selectedMediaChildren?: InstagramMedia[];
    mediaLoading = false;

    private purpose: PhotoUploadPurpose;

    get authorized() {
        return !!this.instagramTokenService.igAccessToken;
    }

    ngOnInit() {
        this.purpose = (this.route.snapshot.url[0]?.parameters?.purpose as PhotoUploadPurpose) ?? PhotoUploadPurpose.avatar;
        if (!this.authorized) {
            this.navigationService.back();
            return;
        }

        this.mediaLoading = true;
        this.instagramGraphService.requestUserPhotos();
        this.instagramGraphService.media.pipe(takeUntil(this.destroyed$)).subscribe(res => {
            this.mediaLoading = false;
            this.media = res;
            setTimeout(() => this.checkIfNeedLoadMore(), 0);
            this.cd.markForCheck();
        });
    }

    onMediaClicked(mediaItem: InstagramMedia) {
        if (mediaItem.isAlbum) {
            this.selectedMedia = mediaItem;
            this.mediaLoading = true;
            this.instagramGraphService
                .getMediaChildren(this.selectedMedia.id)
                .pipe(
                    finalize(() => {
                        this.mediaLoading = false;
                        this.cd.markForCheck();
                    }),
                )
                .subscribe(res => (this.selectedMediaChildren = res.media));
        } else {
            this.photoOverlayService.onWebPhotoSelected(mediaItem.url, this.purpose);
            this.navigationService.back(true);
        }
    }

    back() {
        this.navigationService.back(false);
    }

    close() {
        this.navigationService.back(true);
    }

    checkIfNeedLoadMore() {
        if (this.instagramGraphService.hasNext) {
            this.instagramGraphService.requestMoreUserPhotos();
        }
    }
}
