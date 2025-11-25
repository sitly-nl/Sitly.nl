import { map } from 'rxjs/operators';
import { ApiService } from 'app/services/api/api.service';
import { Injectable, inject } from '@angular/core';
import { Photo } from 'app/models/api/photo';
import { ResponseParser } from 'app/parsers/response-parser';
@Injectable({
    providedIn: 'root',
})
export class PhotoService {
    private apiService = inject(ApiService);

    removePhoto(photoId: string) {
        return this.apiService.delete('/users/me/photos/' + photoId);
    }

    uploadPhoto(photo: string, validateAvatar: boolean) {
        return this.apiService
            .post('/users/me/photos', {
                body: {
                    photo,
                    fileName: 'photo.jpg',
                    validateAvatar,
                },
            })
            .pipe(map(response => ResponseParser.parseObject<Photo>(response)));
    }

    reorderPhotos(photoIds: string[]) {
        return this.apiService.post('/users/me/photos', {
            body: {
                order: photoIds,
            },
        });
    }
}
