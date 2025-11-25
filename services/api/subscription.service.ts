import { map } from 'rxjs/operators';
import { User } from 'app/models/api/user';
import { ApiService } from 'app/services/api/api.service';
import { Injectable, inject } from '@angular/core';
import { ResponseParser } from 'app/parsers/response-parser';
import { UserService } from 'app/services/user.service';

export type WinbackReason = 'cancelPremium' | 'deleteAccount';

@Injectable({
    providedIn: 'root',
})
export class SubscriptionService {
    private apiService = inject(ApiService);
    private userService = inject(UserService);

    stopPremium() {
        return this.setSubscriptionCanceled(true);
    }

    reactivatePremium() {
        return this.setSubscriptionCanceled(false);
    }

    enableDiscount(reason: WinbackReason) {
        return this.apiService
            .post('/users/me/discount', { body: { reason } })
            .pipe(map(response => ResponseParser.parseObject<User>(response)));
    }

    private setSubscriptionCanceled(canceled: boolean) {
        return this.userService.saveUser({ subscriptionCancelled: canceled });
    }
}
