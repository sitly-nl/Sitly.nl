import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FacebookAlbumInterface, FacebookCollectionInterface, FacebookPhotoInterface } from 'app/models/facebook-types';

class FacebookObjectCache<T> {
    objects: T[];
    nextPage: string;
    endOfList: boolean;
}

@Injectable({
    providedIn: 'root',
})
export class FacebookGraphService {
    private albumsCache = new FacebookObjectCache<FacebookAlbumInterface>();
    private albumsSubject = new BehaviorSubject<FacebookAlbumInterface[]>([]);

    private photosCacheMap: Record<string, FacebookObjectCache<FacebookPhotoInterface>> = {};
    private photosSubjectMap: Record<string, BehaviorSubject<FacebookPhotoInterface[]>> = {};

    requestFacebookAlbumsUpdate() {
        FB.api(
            '/me/albums',
            {
                fields: 'count,photos.fields(picture,images),name,cover_photo.fields(picture)',
                type: 'uploaded',
                limit: 25,
                ...(this.albumsCache?.nextPage ? { after: this.albumsCache.nextPage } : {}),
            },
            response => {
                const fbAlbumsResponse = response as FacebookCollectionInterface<FacebookAlbumInterface>;
                this.refreshData(this.albumsSubject, this.albumsCache, fbAlbumsResponse);
            },
        );
    }

    get albums() {
        return this.albumsSubject;
    }

    getAlbumsPhotos(albumId: string) {
        if (!this.photosSubjectMap[albumId]) {
            this.photosSubjectMap[albumId] = new BehaviorSubject<FacebookPhotoInterface[]>([]);
        }

        return this.photosSubjectMap[albumId];
    }

    refreshAlbumPhotos(albumId: string) {
        if (!this.photosCacheMap[albumId]) {
            this.photosCacheMap[albumId] = new FacebookObjectCache<FacebookPhotoInterface>();
        }

        if (!this.photosSubjectMap[albumId]) {
            this.photosSubjectMap[albumId] = new BehaviorSubject<FacebookPhotoInterface[]>([]);
        }

        FB.api(
            `${albumId}/photos`,
            {
                fields: 'picture,images',
                limit: 25,
                ...(this.photosCacheMap[albumId]?.nextPage ? { after: this.photosCacheMap[albumId].nextPage } : {}),
            },
            response => {
                const fbPhotosResponse = response as FacebookCollectionInterface<FacebookPhotoInterface>;
                this.refreshData(this.photosSubjectMap[albumId], this.photosCacheMap[albumId], fbPhotosResponse);
            },
        );
    }

    releaseResources(albumId: string) {
        delete this.photosCacheMap[albumId];
        delete this.photosSubjectMap[albumId];
    }

    private refreshData<T>(subject: BehaviorSubject<T[]>, cache: FacebookObjectCache<T>, response: FacebookCollectionInterface<T>) {
        if (response.error || cache?.endOfList) {
            subject.next(cache.objects);
            return;
        }

        if (!cache.objects) {
            cache.objects = [];
        }

        cache.objects.push(...response.data);
        cache.nextPage = response?.paging?.cursors?.after;
        cache.endOfList = !cache.nextPage;
        subject.next(cache.objects);
    }
}
