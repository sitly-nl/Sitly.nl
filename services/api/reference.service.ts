import { map } from 'rxjs/operators';
import { Reference } from 'app/models/api/reference';
import { ApiService } from 'app/services/api/api.service';
import { Injectable, inject } from '@angular/core';
import { UserService } from 'app/services/user.service';
import { ResponseParser } from 'app/parsers/response-parser';

@Injectable({
    providedIn: 'root',
})
export class ReferenceService {
    private apiService = inject(ApiService);
    private userService = inject(UserService);

    removeReference(referenceId: string) {
        const user = this.userService.authUser;

        user?.references.forEach((value, index) => {
            if (value.id === referenceId) {
                user.references.splice(index, 1);
            }
        });

        this.userService.authUser = user;
        return this.apiService.delete(`/users/me/references/${referenceId}`);
    }

    editReference(reference: Partial<Reference>) {
        return this.apiService
            .patch(`/users/me/references/${reference.id}`, {
                body: {
                    familyName: reference.familyName,
                    description: reference.description,
                },
            })
            .pipe(map(response => ResponseParser.parseObject<Reference>(response)));
    }
}
