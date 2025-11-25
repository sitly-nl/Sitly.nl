import { Injectable, inject } from '@angular/core';
import { ApiService } from 'app/services/api/api.service';

@Injectable({
    providedIn: 'root',
})
export class ReportService {
    private apiService = inject(ApiService);

    reportUser(userId: string, reason: string) {
        return this.apiService.post('/reports', { body: { reportedUserId: userId, reason } });
    }

    reportUserPhoto(userId: string) {
        return this.apiService.post('/reports', { body: { reportedUserId: userId, type: 'avatar' } });
    }
}
