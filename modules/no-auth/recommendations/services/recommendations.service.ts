import { map } from 'rxjs/operators';
import { ApiService } from 'app/services/api/api.service';
import { Injectable, inject } from '@angular/core';
import { ResponseParser } from 'app/parsers/response-parser';
import { BaseApiModel } from 'app/models/api/response';

@Injectable({
    providedIn: 'root',
})
export class RecommendationsService {
    private apiService = inject(ApiService);

    fetchRecommendationLink(firstName: string) {
        return this.apiService
            .post('/users/me/recommendations/links', { body: { firstName } })
            .pipe(map(response => ResponseParser.parseObject(response)));
    }

    askRecommendationViaEmail(email: string, name: string, link: string, message: string) {
        return this.apiService.post('/users/me/recommendations/email', {
            body: {
                email,
                message,
                link,
                recipientName: name,
            },
        });
    }

    postRecommendation(userId: string, token: string, description: string, score: number) {
        return this.apiService.post(`/users/${userId}/recommendations`, {
            body: {
                description,
                score,
                token,
            },
        });
    }

    getSittersTotalNumber() {
        return this.apiService
            .get('/users', {
                noAuth: true,
                params: {
                    'type': 'babysitters',
                    'meta-only': 1,
                },
            })
            .pipe(map(json => ResponseParser.parseObject<BaseApiModel, { totalCount: number }>(json).meta));
    }
}
