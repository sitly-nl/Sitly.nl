import {
    User,
    Gender,
    FosterTrait,
    allFosterTraits,
    allFosterChores,
    FosterChores,
    allFosterSkills,
    allOccupationOptions,
    FosterProperties,
} from 'app/models/api/user';
import { Language } from 'app/models/api/language-interface';
import { Injectable } from '@angular/core';
import { CountrySettings } from 'app/models/api/country-settings-interface';
import { Util } from 'app/utils/utils';

@Injectable({
    providedIn: 'root',
})
export class Settings {
    languages: Record<string, string> = {};
    languageKnowledge: Record<string, boolean> = {};
    ageGroups: Record<string, boolean> = {};
    nativeLanguage?: string;
    nativeLanguageName?: string;
    certificateOptions = [
        { key: 'hasFirstAidCertificate', value: 'settings.hasFirstAidCertificate', checked: false },
        { key: 'hasCertificateOfGoodBehavior', value: 'settings.hasCertificateOfGoodBehavior', checked: false },
        { key: 'hasCar', value: 'settings.hasCar', checked: false },
    ] as {
        key: keyof FosterProperties;
        value: string;
        checked: boolean;
    }[];
    occupationOptions = allOccupationOptions;
    skillsOptions = allFosterSkills.map(item => {
        return {
            key: item,
            value: `profile.skills.${item}`,
            checked: false,
        };
    });
    allTraitOptions = allFosterTraits.map(item => {
        return {
            key: item,
            value: `profile.traits.${item}`,
        };
    });
    choresOptions = allFosterChores.map(item => {
        return {
            key: item,
            value: item !== FosterChores.driving ? `settings.${item}` : 'settings.drivingChildren',
        };
    });
    locationOptions = [
        { key: 'receive', value: 'settings.fosterLocation.myLocation' },
        { key: 'visit', value: 'settings.fosterLocation.theirHome' },
    ] as { key: keyof FosterProperties['fosterLocation']; value: string }[];
    genderOptions = [
        { key: Gender.male, value: 'main.male' },
        { key: Gender.female, value: 'main.female' },
    ];

    trait1?: FosterTrait;
    trait2?: FosterTrait;
    trait3?: FosterTrait;

    locations = {};

    languageOptions: Language[] = [];
    nativeLanguageOptions: Language[] = [];
    otherLanguageOptions: Language[] = [];
    otherLanguage?: string;

    get traitOptions1() {
        return this.allTraitOptions.filter(item => item.key !== this.trait2 && item.key !== this.trait3);
    }

    get traitOptions2() {
        return this.allTraitOptions.filter(item => item.key !== this.trait1 && item.key !== this.trait3);
    }

    get traitOptions3() {
        return this.allTraitOptions.filter(item => item.key !== this.trait1 && item.key !== this.trait2);
    }

    populate(user: User, countrySettings: CountrySettings) {
        // populate foster settings
        if (!user.isParent) {
            this.populateAgeGroups(user);
            this.populateLanguageKnowledge(user);

            this.nativeLanguage = user.fosterProperties?.nativeLanguage?.code;
            this.nativeLanguageName = user.fosterProperties?.nativeLanguage?.name;

            const langCodes = user.fosterProperties?.languages?.map(language => language.code);
            this.otherLanguage = this.otherLanguageOptions.find(language => langCodes?.includes(language.code))?.code;

            this.certificateOptions = this.certificateOptions.filter(
                item => item.key !== 'hasCertificateOfGoodBehavior' || countrySettings.showCertificateOfGoodBehavior,
            );
            this.certificateOptions.forEach(item => {
                item.checked = !!user.fosterProperties[item.key];
            });

            this.skillsOptions.forEach(item => {
                item.checked = user.fosterProperties?.skills?.includes(item.key) ?? false;
            });

            if (!this.trait1 && !this.trait2 && !this.trait3) {
                this.trait1 = user.fosterProperties?.traits?.[0];
                this.trait2 = user.fosterProperties?.traits?.[1];
                this.trait3 = user.fosterProperties?.traits?.[2];
            }

            if (this.otherLanguageOptions.length === 0) {
                this.otherLanguageOptions = countrySettings.nativeLanguageOptions.filter(language => {
                    return !language.isCommon;
                });
            }
            this.languageOptions = countrySettings.languageKnowledgeOptions.filter(language => {
                return language.code !== user.fosterProperties?.nativeLanguage?.code;
            });
        }
    }

    populateLanguageKnowledge(user: User) {
        if (user.fosterProperties?.languages) {
            for (const language of user.fosterProperties.languages) {
                this.languageKnowledge[language.code] = true;
            }
        }
    }

    populateAgeGroups(user: User) {
        if (user.fosterProperties?.ageGroupExperience) {
            for (const ageGroupOption of Util.keysOf(user.fosterProperties.ageGroupExperience)) {
                this.ageGroups[ageGroupOption] = user.fosterProperties.ageGroupExperience[ageGroupOption];
            }
        }
    }
}
