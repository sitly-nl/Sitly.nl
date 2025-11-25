import { map } from 'rxjs/operators';
import { ResponseParser } from 'app/parsers/response-parser';
import { Child } from 'app/models/api/child';
import { ApiService } from 'app/services/api/api.service';
import { Injectable, inject } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class ChildService {
    private apiService = inject(ApiService);

    createChild(child: Child) {
        return this.apiService
            .post('/users/me/children', { body: this.formatParams(child) })
            .pipe(map(response => ResponseParser.parseObject<Child>(response)));
    }

    updateChild(child: Child) {
        return this.apiService
            .patch('/users/me/children/' + child.id, { body: this.formatParams(child) })
            .pipe(map(response => ResponseParser.parseObject<Child>(response)));
    }

    deleteChild(child: Child) {
        return this.apiService.delete('/users/me/children/' + child.id);
    }

    formatParams(child: Child) {
        const birthdate = child.birthdate ? new Date(child.birthdate) : undefined;
        const params: Record<string, unknown> = {
            gender: child.gender,
            birthdate: birthdate?.toISOString(),
        };
        if (child.traits) {
            params.traits = child.traits;
        }
        return params;
    }
}
