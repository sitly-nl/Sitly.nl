import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LastSeenStatus, User } from 'app/models/api/user';
import { switchMap } from 'rxjs/operators';
import { AgoFormattedPipe } from 'app/pipes/ago-formatted.pipe';

@Pipe({
    name: 'onlineAgoFormatted',
    standalone: true,
})
export class OnlineAgoFormattedPipe implements PipeTransform {
    private translateService = inject(TranslateService);
    private agoFormattedPipe = new AgoFormattedPipe();

    transform(user: User) {
        return this.agoFormattedPipe.transform(user).pipe(
            switchMap(value => {
                if (user?.lastSeenStatus === LastSeenStatus.greaterThanTwoMonthsAgo) {
                    return this.translateService.get('profile.inactive2months');
                }

                return this.translateService.get('profile.timeSinceLastOnline', { timeSince: value.toLowerCase() });
            }),
        );
    }
}
