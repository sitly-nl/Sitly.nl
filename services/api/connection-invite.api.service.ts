import { Injectable, inject } from '@angular/core';
import { ApiService } from 'app/services/api/api.service';
import { map } from 'rxjs/operators';
import { ResponseParser } from 'app/parsers/response-parser';
import { ConnectionInvite } from 'app/models/api/connection-invite';

@Injectable({
    providedIn: 'root',
})
export class ConnectionInviteApiService {
    private readonly apiService = inject(ApiService);

    getInvites(action: 'received' | 'sent', createdBefore: Date, page = 1, pageSize = 20) {
        return this.apiService
            .get('/users/me/connection-invites', {
                params: {
                    filter: {
                        action,
                        createdBefore: createdBefore.toISOString(),
                    },
                    page: {
                        number: page,
                        size: pageSize,
                    },
                    include: 'contactUser.children,contactUser.recommendations',
                },
            })
            .pipe(map(response => ResponseParser.parseObject<ConnectionInvite[]>(response)));
    }

    sendInvite(userId: string) {
        return this.apiService.post(`/users/${userId}/connection-invites`);
    }

    viewInvite(inviteId: string) {
        return this.apiService
            .patch(`/users/me/connection-invites/${inviteId}`, {
                body: { viewed: true },
            })
            .pipe(map(response => ResponseParser.parseObject<ConnectionInvite>(response)));
    }

    // TODO: invites - uncomment and test during invites list implementation
    // ignoreInvite(inviteId: string) {
    //     return this.apiService
    //         .post(`/users/me/connection-invites/${inviteId}`, {
    //             body: { status: 'ignored' },
    //         })
    //         .pipe(map(response => ResponseParser.parseObject<ConnectionInvite>(response)));
    // }
}
