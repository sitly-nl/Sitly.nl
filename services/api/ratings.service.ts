import { UserRole } from 'app/models/api/user';
import { ApiService } from 'app/services/api/api.service';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { ResponseParser } from 'app/parsers/response-parser';

enum RatingType {
    all = 'all',
    home = 'home',
    babysit = 'babysit',
    childminder = 'childminder',
    babysitJobs = 'babysit-jobs',
    childminderJobs = 'childminder-jobs',
}

@Injectable({
    providedIn: 'root',
})
export class RatingService {
    private apiService = inject(ApiService);

    getRating(userRole: UserRole) {
        let ratingType: RatingType;
        switch (userRole) {
            case UserRole.parent:
                ratingType = RatingType.babysitJobs;
                break;
            case UserRole.babysitter:
                ratingType = RatingType.babysit;
                break;
            case UserRole.childminder:
                ratingType = RatingType.childminder;
                break;
        }

        return this.apiService
            .get('/cms/ratings', {
                params: {
                    'type': ratingType,
                    'meta-only': 1,
                },
            })
            .pipe(map(json => ResponseParser.parseObject(json).meta));
    }
}
