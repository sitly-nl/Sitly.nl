import { Injectable, inject } from '@angular/core';
import { EmailFrequency, NotificationPreferences } from 'app/models/api/notification-preferences';
import { ResponseParser } from 'app/parsers/response-parser';
import { ApiService } from 'app/services/api/api.service';
import { map } from 'rxjs/operators';

@Injectable({
    providedIn: 'root',
})
export class NotificationPreferencesApiService {
    private readonly apiService = inject(ApiService);

    getPreferences() {
        return this.apiService
            .get('/users/me/notification-preferences')
            .pipe(map(response => ResponseParser.parseObject<NotificationPreferences>(response)));
    }

    updateConnectionInvitesPreferences(emailConnectionInvites: EmailFrequency) {
        return this.apiService
            .patch('/users/me/notification-preferences', {
                body: { emailConnectionInvites },
            })
            .pipe(map(response => ResponseParser.parseObject<NotificationPreferences>(response)));
    }
}
