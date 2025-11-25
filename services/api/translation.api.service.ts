import { ApiService } from 'app/services/api/api.service';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { ServerResponse } from 'app/models/api/response';

@Injectable({
    providedIn: 'root',
})
export class TranslationApiService {
    private apiService = inject(ApiService);

    getTranslations(_lang: string, group: string) {
        // _lang parameter is not needed to be used directly here
        // since language to load is decided in ApiInterceptor class where we supply it through 'Accept-Language' header
        return this.apiService.get(`/translations/${group}`, { brandCode: 'main' }).pipe(map(TranslationApiService.parse));
    }

    private static parse(json: ServerResponse) {
        return (json?.data instanceof Array ? json.data : []).reduce(
            (acc, cur) => {
                if (cur.type === 'translations' && cur.id && cur.attributes?.value) {
                    acc[cur.id] = cur.attributes.value as string;
                }
                return acc;
            },
            {} as Record<string, string>,
        );
    }
}
