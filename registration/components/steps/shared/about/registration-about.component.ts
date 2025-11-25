import { Component } from '@angular/core';
import { RegistrationBaseComponent } from 'registration/components/registration-base.component';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';
import { FormsModule } from '@angular/forms';
import { RegistrationPageContainerComponent } from 'registration/components/page-container/registration-page-container.component';

@Component({
    selector: 'registration-about',
    templateUrl: './registration-about.component.html',
    styleUrls: ['./registration-about.component.less'],
    standalone: true,
    imports: [RegistrationPageContainerComponent, FormsModule, SharedModule, TranslateModule],
})
export class RegistrationAboutComponent extends RegistrationBaseComponent {
    aboutText = this.authUser.about ?? '';
    aboutSuggestion = '';
    minChars = 15;
    maxChars = 1000;

    personalDetailsMentioned = false;
    fake = false;
    showMinLengthError = false;

    private urlRegexp =
        /(?:(?:https?|ftp|file):\/\/|www\.|ftp\.)(?:\([-A-Z0-9+&@#/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#/%=~_|$?!:,.])*(?:\([-A-Z0-9+&@#/%=~_|$?!:,.]*\)|[A-Z0-9+&@#/%=~_|$])/gim;
    private emailRegexp =
        /([a-zA-Z0-9._%+-]+)(\s?)(@|(\[|\(|\s)+at(\]|\)|\s)+|(\[|\(|\s)+ad(\]|\)|\s)+|(\[|\(|\s)+AT(\]|\)|\s)+|([[(])+AD(\]|\)|\s)+)(\s?)([a-zA-Z0-9.-]+)(\s?)([[|(]?(\.|(\[|\(|\s)+dot(\]|\)|\s)+|(\[|\(|\s)+punto(\]|\)|\s)+|(\[|\(|\s)+punkt(\]|\)|\s)+|punto(\]|\)|\s)+|(\[|\(|\s)+punkt(\]|\)|\s)+|(\[|\(|\s)+punt(\]|\)|\s)+|(\[|\(|\s)+PUNKT(\]|\)|\s)+|(\[|\(|\s)+punkt(\]|\)|\s)+|(\[|\(|\s)+DOT(\]|\)|\s)+|(\[|\(|\s)+PUNTO(\]|\)|\s)+|(\[|\(|\s)+PUNT(\]|\)|\s)+)([\])])?)(\s?)([a-zA-Z]{2,4})/;
    private fakeRegexp = RegExp(this.countrySettings.aboutChecks.fake);

    ngOnInit() {
        this.userService.aboutSuggestion().subscribe(res => (this.aboutSuggestion = res));
        this.check();
    }

    handleNextClick() {
        if (!this.aboutText && this.aboutSuggestion) {
            this.aboutText = this.aboutSuggestion;
            this.showMinLengthError = this.aboutText.length < this.minChars;
            this.showToast = true;
            setTimeout(() => {
                this.showToast = false;
                this.cd.markForCheck();
            }, 15_000);
            return;
        }

        if (this.aboutText.length < this.minChars) {
            this.showMinLengthError = true;
            return;
        }

        if (this.fake) {
            return;
        }

        this.userService
            .saveUser({
                about: this.aboutText.substring(0, this.maxChars),
            })
            .subscribe();
        super.handleNextClick();
    }

    check() {
        this.personalDetailsMentioned =
            this.hasUrl(this.aboutText) || this.hasEmailAddress(this.aboutText) || this.hasPhoneNumber(this.aboutText);

        this.fake = this.aboutText.length >= this.minChars && !this.fakeRegexp.test(this.aboutText);

        if (this.showMinLengthError) {
            this.showMinLengthError = this.aboutText.length < this.minChars;
        }
    }

    private hasEmailAddress(text: string) {
        return this.emailRegexp.test(text);
    }

    private hasPhoneNumber(text: string) {
        return /\d{5,}/.test(text.replace(/[^a-zA-Z0-9]/g, ''));
    }

    private hasUrl(text: string) {
        return this.urlRegexp.test(text);
    }
}
