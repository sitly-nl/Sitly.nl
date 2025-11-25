import { Component } from '@angular/core';
import { Language } from 'app/models/api/language-interface';
import { RegistrationBaseComponent } from 'registration/components/registration-base.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatOption } from '@angular/material/core';
import { MatAutocompleteTrigger, MatAutocomplete } from '@angular/material/autocomplete';
import { SharedModule } from 'modules/shared/shared.module';
import { RegistrationPageContainerComponent } from 'registration/components/page-container/registration-page-container.component';

@Component({
    selector: 'registration-native-language',
    templateUrl: './registration-native-language.component.html',
    styleUrls: ['./registration-native-language.component.less'],
    standalone: true,
    imports: [RegistrationPageContainerComponent, SharedModule, MatAutocompleteTrigger, MatAutocomplete, MatOption, TranslateModule],
})
export class RegistrationNativeLanguageComponent extends RegistrationBaseComponent {
    selectedLanguage = this.authUser.fosterProperties.nativeLanguage;
    languages = this.countrySettings.nativeLanguageOptions.filter(item => item.isCommon);
    otherLanguages = this.countrySettings.nativeLanguageOptions.filter(item => !item.isCommon);
    otherLanguageOptions = this.otherLanguages.filter(item => item.code !== this.selectedLanguage?.code);
    isOtherLanguageSelected = this.otherLanguages.some(item => item.code === this.selectedLanguage?.code);

    save(language: Language) {
        this.authUser.fosterProperties.nativeLanguage = language;
        this.userService
            .saveUser({
                nativeLanguage: language.code,
            })
            .subscribe();
        super.handleNextClick();
    }

    selectOther(code: string) {
        const language = this.otherLanguages.find(item => item.code === code);
        this.authUser.fosterProperties.nativeLanguage = language ?? null;
        if (language) {
            this.save(language);
        } else {
            this.registrationService.updateNextButtonShowState();
        }
    }
}
