import { Component } from '@angular/core';
import { RegistrationBaseComponent } from 'registration/components/registration-base.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatOption } from '@angular/material/core';
import { MatAutocompleteTrigger, MatAutocomplete } from '@angular/material/autocomplete';
import { SharedModule } from 'modules/shared/shared.module';
import { RegistrationPageContainerComponent } from 'registration/components/page-container/registration-page-container.component';

@Component({
    selector: 'registration-other-languages',
    templateUrl: './registration-other-languages.component.html',
    styleUrls: ['./registration-other-languages.component.less'],
    standalone: true,
    imports: [RegistrationPageContainerComponent, SharedModule, MatAutocompleteTrigger, MatAutocomplete, MatOption, TranslateModule],
})
export class RegistrationOtherLanguagesComponent extends RegistrationBaseComponent {
    languages = this.countrySettings.languageKnowledgeOptions
        .filter(item => item.code !== this.authUser.fosterProperties.nativeLanguage?.code)
        .map(item => {
            return {
                value: item,
                selected: this.authUser.fosterProperties?.languages?.some(lang => lang.code === item.code),
            };
        });

    selectedOtherLanguages = this.countrySettings.nativeLanguageOptions
        .filter(
            item =>
                item.code !== this.authUser.fosterProperties.nativeLanguage?.code &&
                !this.languages.some(lang => lang.value.code === item.code) &&
                this.authUser.fosterProperties.languages?.some(lang => item.code === lang.code),
        )
        .map(item => {
            return {
                value: item,
                selected: true,
            };
        });

    get otherLanguages() {
        return this.countrySettings.nativeLanguageOptions.filter(
            item =>
                item.code !== this.authUser.fosterProperties.nativeLanguage?.code &&
                !this.languages.some(lang => lang.value.code === item.code) &&
                !this.selectedOtherLanguages.some(lang => lang.value.code === item.code),
        );
    }

    handleNextClick() {
        const languages = this.languages.filter(item => item.selected).map(item => item.value.code);
        if (this.selectedOtherLanguages) {
            languages.push(...this.selectedOtherLanguages.map(item => item.value.code));
        }
        this.userService.saveUser({ languages }).subscribe();
        super.handleNextClick();
    }

    selectOther(code: string) {
        const language = this.otherLanguages.find(item => item.code === code);
        if (language) {
            this.selectedOtherLanguages.push({
                value: language,
                selected: true,
            });
        }
    }

    onSelectedOtherLanguageClick(code: string) {
        this.selectedOtherLanguages = this.selectedOtherLanguages.filter(item => item.value.code !== code);
    }
}
