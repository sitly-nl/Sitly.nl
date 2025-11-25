import { ApiService } from 'app/services/api/api.service';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { ResponseParser } from 'app/parsers/response-parser';

@Injectable({
    providedIn: 'root',
})
export class FeedbackService {
    private apiService = inject(ApiService);

    postFeedback(text: string) {
        return this.apiService.post('/feedbacks', {
            body: {
                category: 'Mobile Backend',
                description: text,
            },
        });
    }

    getEkomiLink() {
        return this.apiService.get('/feedbacks/ekomi').pipe(
            map(json => ResponseParser.parseObject(json)),
            map(response => response?.links?.ekomi),
        );
    }

    getTrustpilotLink() {
        return this.apiService.get('/feedbacks/trustpilot').pipe(
            map(json => ResponseParser.parseObject(json)),
            map(response => response?.links?.trustpilot),
        );
    }

    getGoogleLink() {
        return this.apiService.get('/feedbacks/google').pipe(
            map(json => ResponseParser.parseObject(json)),
            map(response => response?.links?.google),
        );
    }
}
