import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CountrySettingsService } from 'app/services/country-settings.service';
import { UcFirst } from 'modules/shared/pipes/ucfirst.pipe';
import { format } from 'date-fns';
import differenceInDays from 'date-fns/differenceInDays';
import { map } from 'rxjs/operators';

@Pipe({
    name: 'conversationDate',
})
export class ConversationDatePipe implements PipeTransform {
    private readonly translateService = inject(TranslateService);
    private readonly ucFirst = inject(UcFirst);
    private readonly countrySettingsService = inject(CountrySettingsService);

    transform(value: Date) {
        return this.translateService.get(['today', 'yesterday']).pipe(
            map(translations => {
                const days = differenceInDays(new Date(), value);
                if (days < 1) {
                    return this.ucFirst.transform(translations.today);
                }
                if (days < 2) {
                    return translations.yesterday;
                } else {
                    return format(value, this.countrySettingsService.countrySettings?.countryCode === 'ca' ? 'yy/M/d' : 'd/M/yy');
                }
            }),
        );
    }
}
