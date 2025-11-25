import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { InstagramTokenService } from 'app/services/instagram/instagram-token.service';

export interface InstagramGraphResponse {
    data: InstagramGraphDataItem[];
    paging: InstagramGraphPaging;
}

export interface InstagramGraphDataItem {
    id: string;
    media_type: string;
    media_url: string;
}

export interface InstagramGraphPaging {
    cursors: {
        before: string;
        after: string;
    };
    next: string;
}

export interface InstagramMedia {
    isAlbum: boolean;
    url: string;
    id: string;
}

export interface InstagramMediaResponse {
    media?: InstagramMedia[];
    linkNext?: string;
}

@Injectable({
    providedIn: 'root',
})
export class InstagramGraphService {
    private instagramTokenService = inject(InstagramTokenService);
    private http = inject(HttpClient);

    private mediaCache: InstagramMedia[] = [];
    private media$ = new BehaviorSubject<InstagramMedia[]>([]);
    private linkNext?: string;

    get media() {
        return this.media$.asObservable();
    }

    get hasNext() {
        return !!this.linkNext;
    }

    requestUserPhotos() {
        this.performRequest(
            this.http.get(
                'https://graph.instagram.com/me/media?fields=id,media_type,media_url&access_token=' +
                    `${this.instagramTokenService.igAccessToken}`,
            ),
        );
    }

    requestMoreUserPhotos() {
        if (this.linkNext) {
            this.performRequest(this.http.get(this.linkNext));
        }
    }

    getMediaChildren(mediaId: string) {
        return this.http
            .get(
                `https://graph.instagram.com/${mediaId}/children?fields=id,media_type,media_url&access_token=` +
                    `${this.instagramTokenService.igAccessToken}`,
            )
            .pipe(map(res => this.convertMedia(res as InstagramGraphResponse)));
    }

    private performRequest(request: Observable<unknown>) {
        request.pipe(map(res => this.convertMedia(res as InstagramGraphResponse))).subscribe((res: InstagramMediaResponse) => {
            if (res.media) {
                this.mediaCache.push(...res.media);
            }
            this.linkNext = res.linkNext;
            this.media$.next(this.mediaCache);
        });
    }

    private convertMedia(res: InstagramGraphResponse) {
        const response: InstagramMediaResponse = {};
        const media: InstagramMedia[] = [];

        for (const item of res.data) {
            if (item.media_type !== 'IMAGE' && item.media_type !== 'CAROUSEL_ALBUM') {
                continue;
            }

            media.push({
                id: item.id,
                url: item.media_url,
                isAlbum: item.media_type === 'CAROUSEL_ALBUM',
            });
        }

        response.media = media;
        response.linkNext = res.paging?.next;
        return response;
    }
}
