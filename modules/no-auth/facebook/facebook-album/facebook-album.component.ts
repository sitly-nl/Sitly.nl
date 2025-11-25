import { FacebookAlbumInterface, FacebookPhotoInterface } from 'app/models/facebook-types';
import { Component, OnInit, Input, EventEmitter, Output, OnDestroy, inject } from '@angular/core';
import { FacebookGraphService } from 'app/services/facebook/facebook-graph.service';
import { BaseComponent } from 'app/components/base.component';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector: 'facebook-album',
    templateUrl: './facebook-album.component.html',
    styleUrls: ['./facebook-album.component.less'],
    standalone: true,
    imports: [],
})
export class FacebookAlbumComponent extends BaseComponent implements OnInit, OnDestroy {
    readonly facebookGraphService = inject(FacebookGraphService);

    @Input({ required: true }) album: FacebookAlbumInterface;

    _photos: FacebookPhotoInterface[];

    private _photoSelected = new EventEmitter<FacebookPhotoInterface>();

    ngOnInit() {
        this._photos = this.album.photos.data;

        this.facebookGraphService
            .getAlbumsPhotos(this.album.id)
            .pipe(takeUntil(this.destroyed$))
            .subscribe(response => {
                if (response.length > 0 && this._photos.length === 0) {
                    this.facebookGraphService.refreshAlbumPhotos(this.album.id);
                }
                this._photos = response;
                this.cd.markForCheck();
            });

        this.facebookGraphService.refreshAlbumPhotos(this.album.id);
    }

    ngOnDestroy() {
        super.ngOnDestroy();
        this.facebookGraphService.releaseResources(this.album.id);
    }

    get photos() {
        return this._photos;
    }

    @Output('photoSelected')
    get photoSelected() {
        return this._photoSelected;
    }

    onPhotoClicked(photo: FacebookPhotoInterface) {
        this._photoSelected.emit(photo);
    }

    loadMorePhotos() {
        this.facebookGraphService.refreshAlbumPhotos(this.album.id);
    }
}
