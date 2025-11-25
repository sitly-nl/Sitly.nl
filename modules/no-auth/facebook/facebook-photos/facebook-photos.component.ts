import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FacebookAlbumInterface, FacebookPhotoInterface } from 'app/models/facebook-types';
import { ActivatedRoute } from '@angular/router';
import { FacebookGraphService } from 'app/services/facebook/facebook-graph.service';
import { Constants } from 'app/utils/constants';
import { BaseComponent } from 'app/components/base.component';
import { PhotoUploadPurpose } from 'app/models/api/photo';
import { takeUntil } from 'rxjs/operators';
import { PhotoOverlayService } from 'app/services/overlay/photo-overlay.service';
import { TranslateModule } from '@ngx-translate/core';
import { InfiniteScrollDirective } from 'ngx-infinite-scroll';
import { FacebookAlbumItemComponent } from 'modules/facebook/facebook-album-item/facebook-album-item.component';
import { FacebookAlbumComponent } from 'modules/facebook/facebook-album/facebook-album.component';

@Component({
    selector: 'facebook-photos',
    templateUrl: './facebook-photos.component.html',
    styleUrls: ['./facebook-photos.component.less'],
    standalone: true,
    imports: [InfiniteScrollDirective, FacebookAlbumItemComponent, FacebookAlbumComponent, TranslateModule],
})
export class FacebookPhotosComponent extends BaseComponent implements OnInit, OnDestroy {
    albums: FacebookAlbumInterface[];
    selectedAlbum?: FacebookAlbumInterface;

    private readonly facebookGraphService = inject(FacebookGraphService);
    private readonly photoOverlayService = inject(PhotoOverlayService);
    private readonly route = inject(ActivatedRoute);
    private purpose: PhotoUploadPurpose;

    ngOnInit() {
        const paramMap = this.route.snapshot.paramMap;
        this.purpose = (paramMap.get('purpose') as PhotoUploadPurpose) ?? PhotoUploadPurpose.avatar;

        this.facebookGraphService.albums.pipe(takeUntil(this.destroyed$)).subscribe(
            (response: FacebookAlbumInterface[]) => {
                if (response) {
                    this.albums = response.filter(item => {
                        return !!item.cover_photo && item.count > 0;
                    });
                    this.cd.markForCheck();
                }
            },
            e => console.error('Error fetching photos', e),
        );

        this.facebookGraphService.requestFacebookAlbumsUpdate();
    }

    onAlbumSelected(album: FacebookAlbumInterface) {
        this.selectedAlbum = album;
        this.cd.markForCheck();
    }

    onPhotoSelected(photo: FacebookPhotoInterface) {
        const imgUrl = this.getOptimizedUrl(photo);
        if (imgUrl) {
            this.photoOverlayService.onWebPhotoSelected(imgUrl, this.purpose);
            this.navigationService.back(true);
        } else {
            this.onError();
        }
    }

    loadMoreAlbums() {
        this.facebookGraphService.requestFacebookAlbumsUpdate();
    }

    loadMorePhotos() {
        if (this.selectedAlbum) {
            this.facebookGraphService.refreshAlbumPhotos(this.selectedAlbum.id);
        }
    }

    back() {
        if (this.selectedAlbum) {
            this.selectedAlbum = undefined;
        } else {
            this.close();
        }
    }

    close() {
        this.navigationService.back(true);
    }

    private getOptimizedUrl(photo: FacebookPhotoInterface) {
        for (const img of photo.images ?? []) {
            if (img.height > Constants.uploadImgMaxSize || img.width > Constants.uploadImgMaxSize) {
                continue;
            }

            return img.source;
        }
        return undefined;
    }

    private onError() {
        this.navigationService.back(true);
    }
}
