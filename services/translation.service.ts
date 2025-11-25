import { Type } from '@angular/core';
import { MissingTranslationHandler, MissingTranslationHandlerParams, TranslateLoader } from '@ngx-translate/core';
import { captureException } from '@sentry/angular';
import { environment } from 'environments/environment';

export const translateModuleConfig = <E extends TranslateLoader>(loaderType: Type<E>, isolate = true) => {
    return {
        defaultLanguage: 'en',
        isolate,
        missingTranslationHandler: {
            provide: MissingTranslationHandler,
            useClass: MissingTranslationsHandler,
        },
        loader: {
            provide: TranslateLoader,
            useClass: loaderType,
        },
    };
};

class MissingTranslationsHandler implements MissingTranslationHandler {
    private readonly keyRegExp = /^(?:[a-zA-Z0-9]+\.)+[a-zA-Z0-9]+$/;

    handle(params: MissingTranslationHandlerParams) {
        const shouldTrack =
            params.translateService.currentLang &&
            Object.keys((params.translateService.translations as Record<string, unknown>)?.[params.translateService.currentLang] ?? {})
                .length > 0 &&
            this.keyRegExp.exec(params.key) !== null &&
            environment.name === 'production';
        if (shouldTrack) {
            captureException(`missing translation: ${params.key}, lang: ${params.translateService.currentLang}`);
        }
        return params.key;
    }
}
