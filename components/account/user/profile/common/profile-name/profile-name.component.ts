import { AfterViewChecked, Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { ProfileBlockComponent } from 'app/components/user/profile/common/profile-block/profile-block.component';
import { allFosterChores, FosterChores, Gender, YearsExperience } from 'app/models/api/user';
import { ExperienceYearsPipe } from 'app/pipes/experience-years.pipe';
import { isAfter, sub } from 'date-fns';
import { HourlyRatePipe } from 'app/pipes/hourly-rate.pipe';
import { FeatureService } from 'app/services/feature.service';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';

export enum ViewMode {
    singleLine,
    doubleLine,
    column,
}

@Component({
    selector: 'profile-name',
    templateUrl: './profile-name.component.html',
    styleUrls: ['./profile-name.component.less'],
    standalone: true,
    imports: [SharedModule, TranslateModule],
})
export class ProfileNameComponent extends ProfileBlockComponent implements OnInit, AfterViewChecked {
    readonly featureService = inject(FeatureService);

    @ViewChild('firstNameSpace') firstNameSpace: ElementRef<HTMLDivElement>;
    firstNameOverflow: boolean;

    get showPremium() {
        return this.featureService.showPremiumLabel && this.user.isPremium;
    }
    get isNew() {
        return isAfter(new Date(this.user.created), sub(new Date(), { weeks: 1 }));
    }
    get userRoleGender() {
        if (!this.translations || !this.user.isParent) {
            return '';
        }

        const values = [];
        if (this.user.gender) {
            values.push(this.user.gender === Gender.male ? this.translations['profile.dad'] : this.translations['profile.mom']);
        } else {
            values.push(this.translations['main.parent']);
        }
        return values.join(', ');
    }
    get userMainVariables() {
        if (!this.translations || !this.user.fosterProperties) {
            return [];
        }

        const variables = [];
        if (this.user.fosterProperties.hasReferences) {
            variables.push({ value: 'profile.references' });
        }
        if (this.user.fosterProperties.yearsOfExperience) {
            variables.push({
                value:
                    this.user.fosterProperties.yearsOfExperience === YearsExperience.one
                        ? 'profile.experience.oneYear'
                        : 'profile.experience.years',
                args: { years: new ExperienceYearsPipe().transform(this.user.fosterProperties.yearsOfExperience) },
            });
        }
        if (this.user.fosterProperties.hasFirstAidCertificate) {
            variables.push({ value: 'profile.skills.firstAid' });
        }
        if (this.user.fosterProperties.averageHourlyRate && this.user.fosterProperties.averageHourlyRate !== 'negotiate') {
            variables.push({
                value: 'hourlyRate.perHour.format',
                args: {
                    amount: this.hourlyRatePipe.transform(this.user.fosterProperties.averageHourlyRate) ?? '',
                },
            });
        }
        const language = this.user.fosterProperties.languages?.[0];
        if (language && this.user.fosterProperties.nativeLanguage) {
            variables.push({
                value: 'profile.alsoSpeaks.format',
                args: {
                    value: `${this.user.fosterProperties.nativeLanguage.localName} & ${language.localName}`,
                },
            });
        }
        if (this.user.fosterProperties.fosterChores.driving) {
            variables.push({ value: 'profile.canDrive' });
        }
        if (this.user.fosterProperties.isAvailableRegularly || this.user.fosterProperties.isAvailableOccasionally) {
            variables.push({
                value:
                    this.user.fosterProperties.isAvailableRegularly && this.user.fosterProperties.isAvailableOccasionally
                        ? 'careType.regular&occasional'
                        : this.user.fosterProperties.isAvailableOccasionally
                          ? 'careType.occasional'
                          : 'careType.regular',
            });
        }
        allFosterChores.forEach(item => {
            if (item !== FosterChores.driving && this.user.fosterProperties?.fosterChores[item]) {
                variables.push({ value: `settings.${item}` });
            }
        });
        return variables;
    }

    private translations: Record<string, string>;
    private hourlyRatePipe = new HourlyRatePipe();

    ngOnInit() {
        this.translateService.get(['main.parent', 'profile.mom', 'profile.dad']).subscribe(translations => {
            this.translations = translations;
            this.cd.markForCheck();
        });
    }

    ngAfterViewChecked() {
        const space = this.firstNameSpace?.nativeElement;
        if (space) {
            // if space element has 0 width, it means first name took all available space,
            // and now we can apply fade out effect to first name element
            this.firstNameOverflow = space.clientWidth === 0;
        }

        this.cd.detectChanges();
    }
}
