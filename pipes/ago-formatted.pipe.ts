import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs/operators';
import { LastSeenStatus, User } from 'app/models/api/user';

@Pipe({
    name: 'agoFormatted',
    standalone: true,
})
export class AgoFormattedPipe implements PipeTransform {
    private translateService = inject(TranslateService);

    transform(user: User) {
        return this.translateService
            .get([
                'today',
                'yesterday',
                'profile.inactive2months',
                'profile.timeSinceLastOnline',
                'profile.now',
                'profile.weekAgo',
                'profile.2weeksAgo',
                'profile.3weeksAgo',
                'profile.1monthAgo',
                'profile.2monthsAgo',
                'profile.moreThan2monthsAgo',
                'profile.fewDaysAgo',
            ])
            .pipe(
                map(translations => {
                    switch (user.lastSeenStatus) {
                        case LastSeenStatus.online:
                            return '';
                        case LastSeenStatus.today:
                            return translations.today;
                        case LastSeenStatus.yesterday:
                            return translations.yesterday;
                        case LastSeenStatus.twoDaysAgo:
                            return translations['profile.fewDaysAgo'].replace('{{days}}', '2');
                        case LastSeenStatus.threeDaysAgo:
                            return translations['profile.fewDaysAgo'].replace('{{days}}', '3');
                        case LastSeenStatus.fourDaysAgo:
                            return translations['profile.fewDaysAgo'].replace('{{days}}', '4');
                        case LastSeenStatus.fiveDaysAgo:
                            return translations['profile.fewDaysAgo'].replace('{{days}}', '5');
                        case LastSeenStatus.sixDaysAgo:
                            return translations['profile.fewDaysAgo'].replace('{{days}}', '6');
                        case LastSeenStatus.weekAgo:
                            return translations['profile.weekAgo'];
                        case LastSeenStatus.twoWeeksAgo:
                            return translations['profile.2weeksAgo'];
                        case LastSeenStatus.threeWeeksAgo:
                            return translations['profile.3weeksAgo'];
                        case LastSeenStatus.monthAgo:
                            return translations['profile.1monthAgo'];
                        default:
                            return translations['profile.moreThan2monthsAgo'];
                    }
                }),
            );
    }
}
