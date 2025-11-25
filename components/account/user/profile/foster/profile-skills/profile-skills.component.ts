import { Component, OnInit } from '@angular/core';
import { ProfileBlockComponent } from 'app/components/user/profile/common/profile-block/profile-block.component';
import { UcFirst } from 'modules/shared/pipes/ucfirst.pipe';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';

@Component({
    selector: 'profile-skills',
    templateUrl: './profile-skills.component.html',
    styleUrls: ['./profile-skills.component.less'],
    standalone: true,
    imports: [SharedModule, TranslateModule],
})
export class ProfileSkillsComponent extends ProfileBlockComponent implements OnInit {
    get nativeLanguage() {
        return this.user.fosterProperties.nativeLanguage;
    }
    get otherLanguages() {
        if (!this.user.fosterProperties.languages) {
            return [];
        }
        return this.user.fosterProperties.languages.filter(item => {
            return !this.nativeLanguage || item.code !== this.nativeLanguage.code;
        });
    }
    get hasFosterSkills() {
        return (this.user.fosterProperties?.skills?.length ?? 0) > 0;
    }
    get skills() {
        const skills = this.user.fosterProperties?.skills;
        if (!skills || skills.length === 0 || !this.translations) {
            return null;
        }

        const values = [];
        for (const skill of skills) {
            values.push(this.translations[`profile.skills.${skill}`]);
        }

        return values.aggregatedDescription(` ${this.translations['main.and']} `);
    }
    get languages() {
        const values = [];
        const nativeLabel = this.translations ? `(${this.translations['profile.native']}` : '';
        if (this.nativeLanguage) {
            values.push(`${this.ucfirst.transform(this.nativeLanguage.name)} ${nativeLabel})`);
        }
        for (const lang of this.otherLanguages) {
            values.push(this.ucfirst.transform(lang.name));
        }
        return values.aggregatedDescription();
    }
    get showCertificateOfGoodBehaviour() {
        return this.countrySettingsService.countrySettings?.showCertificateOfGoodBehavior;
    }

    private translations: Record<string, string>;
    private ucfirst: UcFirst;

    ngOnInit() {
        this.ucfirst = new UcFirst();
        this.translateService
            .get([
                'profile.skills.art',
                'profile.skills.sports',
                'profile.skills.music',
                'profile.skills.baking',
                'profile.skills.games',
                'profile.skills.storytelling',
                'profile.native',
                'main.and',
            ])
            .subscribe(res => {
                this.translations = res;
                this.cd.markForCheck();
            });
    }
}
