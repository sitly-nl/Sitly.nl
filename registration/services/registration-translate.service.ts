import { Injectable, inject } from '@angular/core';
import { TranslateLoader } from '@ngx-translate/core';
import { TranslationApiService } from 'app/services/api/translation.api.service';

@Injectable({
    providedIn: 'root',
})
export class RegistrationTranslateService implements TranslateLoader {
    private readonly translationApiService = inject(TranslationApiService);

    getTranslation(lang: string) {
        return this.translationApiService.getTranslations(lang, 'web-app.registration');
    }
}
