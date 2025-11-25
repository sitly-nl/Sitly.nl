import { inject, Injectable } from '@angular/core';
import { UserService } from 'app/services/user.service';
import { CountrySettingsService } from 'app/services/country-settings.service';
import { EnvironmentUtils } from 'app/utils/device-utils';
import { formattedDate } from 'app/models/date-languages';
import { createSlider, Slider } from '@typeform/embed';
import { captureException } from '@sentry/angular';
import { LocaleService } from 'app/services/locale.service';

type SurveyType = 'invites';
type SurveyLanguage = 'en' | 'nb' | 'es' | 'pt' | 'de' | 'fr' | 'fi' | 'nl' | 'my' | 'dk' | 'it' | 'default';
const typeformSurveys: Record<SurveyType, Partial<Record<SurveyLanguage, string>>> = {
    invites: {
        en: 'Q0b5pJW9',
        nb: 'rDUzpX0g',
        es: 'd7vkUpFX',
        pt: 'zYXOssYC',
        de: 'RuwamhJK',
        fr: 'FEOB9ZlW',
        fi: 'XQ8vI9h2',
        nl: 'Jp8hF1Uk',
        my: 'SS0AYHh2',
        dk: 'cpntooU2',
        it: 'vdn5wkCO',
    },
};

@Injectable({
    providedIn: 'root',
})
export class TypeformService {
    private readonly userService = inject(UserService);
    private readonly localeService = inject(LocaleService);
    private readonly countrySettingsService = inject(CountrySettingsService);
    private currentSurvey?: Slider;

    private get authUser() {
        return this.userService.authUser;
    }
    private getUserAgeRange() {
        if (!this.authUser?.age) {
            return 'n/a';
        }

        if (this.authUser.age <= 21) {
            return 'min-21';
        } else if (this.authUser.age <= 27) {
            return '22-27';
        } else if (this.authUser.age <= 32) {
            return '28-32';
        } else {
            return '33+';
        }
    }
    private get hiddenFields() {
        const result = {} as Record<string, string>;

        if (this.countrySettingsService.countrySettings) {
            result.country = `${this.countrySettingsService.countrySettings.countryCode}`;
        }
        if (this.authUser) {
            result.role = `${this.authUser.role}`;
            result.premium = `${this.authUser.isPremium}`;

            if (this.authUser.isPremium && this.authUser.subscription) {
                result.subscription = `${this.authUser.subscription.duration}m`;
            }
            result.regularCare = `${this.authUser.hasRegularCare}`;
            result.occasionalCare = `${this.authUser.isAvailableOccasionally}`;
            result.afterSchool = `${this.authUser.isAvailableAfterSchool}`;
            result.signupDate = formattedDate(this.authUser.created, 'dd-MM-yyyy', this.localeService.getLanguageCode());
            result.platform = EnvironmentUtils.isAndroid ? 'android' : 'web-app';

            if ((this.authUser.children.length ?? 0) > 0) {
                result.children = `${this.authUser.children.length}`;
            }
            if (this.authUser.age) {
                result.age = `${this.getUserAgeRange()}`;
            }
        }

        return result;
    }

    openSurvey(surveyType: SurveyType) {
        if (this.currentSurvey) {
            return;
        }

        const language = this.localeService.getLanguageCode() as SurveyLanguage;
        const survey = typeformSurveys[surveyType][language] ?? typeformSurveys[surveyType].default;

        if (survey) {
            this.currentSurvey = createSlider(survey, {
                hidden: this.hiddenFields,
                onClose: () => {
                    this.currentSurvey = undefined;
                },
                onSubmit: () => setTimeout(() => this.currentSurvey?.close(), 1000),
            });
            this.currentSurvey.open();
        } else {
            captureException(`survey not found: ${surveyType}, lang: ${language}`);
        }
    }
}
