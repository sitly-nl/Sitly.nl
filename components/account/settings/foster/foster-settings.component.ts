import { Language } from 'app/models/api/language-interface';
import { ChangeDetectionStrategy, Component, ElementRef, OnInit, QueryList, ViewChild, ViewChildren, inject } from '@angular/core';
import { Reference } from 'app/models/api/reference';
import { UserAvailabilityInterface, allFosterTraits } from 'app/models/api/user';
import { SettingsBaseComponent } from 'app/components/settings/settings-base.component';
import { takeUntil } from 'rxjs/operators';
import { EventAction, PromptEvents } from 'app/services/tracking/types';
import { RouteType } from 'routing/route-type';
import { HourlyRateOption } from 'app/models/api/country-settings-interface';
import { RecommendationScreen } from 'modules/shared/enums/recommendation-screen';
import { StandardOverlayComponent } from 'app/components/common/overlay-content/standard-overlay/standard-overlay.component';
import { ReferenceService } from 'app/services/api/reference.service';
import { EditReferenceComponent } from 'app/components/settings/foster/edit-reference/edit-reference.component';
import { HourlyRatePipe } from 'app/pipes/hourly-rate.pipe';
import { ExperienceYearsPipe } from 'app/pipes/experience-years.pipe';
import { TranslateModule } from '@ngx-translate/core';
import { DatepickerComponent } from 'app/components/common/date-picker/datepicker.component';
import { FormsModule } from '@angular/forms';
import { FormCheckboxComponent } from 'app/components/common/form/checkbox.component';
import { AvailabilityCalendarComponent } from 'app/components/availability-calendar/availability-calendar.component';
import { SharedModule } from 'modules/shared/shared.module';
import { LowerCasePipe } from '@angular/common';
import { ReferenceComponent } from 'app/components/settings/reference/reference.component';

@Component({
    selector: 'foster-settings',
    templateUrl: './foster-settings.component.html',
    styleUrls: ['./foster-settings.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        SharedModule,
        AvailabilityCalendarComponent,
        FormCheckboxComponent,
        FormsModule,
        ReferenceComponent,
        DatepickerComponent,
        LowerCasePipe,
        TranslateModule,
        ExperienceYearsPipe,
        HourlyRatePipe,
    ],
})
export class FosterSettingsComponent extends SettingsBaseComponent implements OnInit {
    referenceService = inject(ReferenceService);

    maxYear: number;
    hourlyRateOptions: HourlyRateOption[];

    get fosterProperties() {
        return this.authUser.fosterProperties;
    }

    @ViewChild('otherLanguage') otherLanguageInput: ElementRef<HTMLInputElement>;
    @ViewChildren('languageCheckbox') languageInputs: QueryList<ElementRef<HTMLInputElement>>;
    @ViewChildren('skillCheckbox') skillInputs: QueryList<ElementRef<HTMLInputElement>>;
    @ViewChildren('traitInput') traitInputs: QueryList<ElementRef<HTMLInputElement>>;
    @ViewChildren('ageGroupInput') ageGroupInputs: QueryList<ElementRef<HTMLInputElement>>;
    @ViewChildren('choresInput') choresInputs: QueryList<ElementRef<HTMLInputElement>>;

    ngOnInit() {
        const countrySettings = this.countrySettings;
        this.settings.nativeLanguageOptions = countrySettings.nativeLanguageOptions;

        this.hourlyRateOptions = countrySettings.hourlyRateOptions;
        this.settings.populate(this.authUser.deepCopy(), this.countrySettings);
        this.util.delay(() => {
            this.cd.markForCheck();
        }, 0);

        this.maxYear = this.authUser.isChildminder ? -18 : -14;
        this.cd.markForCheck();
        this.util.delay(() => {
            this.cd.markForCheck();
        }, 0);

        this.userService.changed.pipe(takeUntil(this.destroyed$)).subscribe(() => {
            this.settings.populate(this.authUser, this.countrySettings);

            this.cd.markForCheck();
            this.util.delay(() => {
                this.cd.markForCheck();
            }, 0);
        });
    }

    get userLanguages() {
        const result: Record<string, Language> = {};
        if (this.authUser?.fosterProperties?.languages) {
            for (const language of this.authUser.fosterProperties.languages) {
                result[language.code] = language;
            }
        }
        return result;
    }

    get hasRecommendations(): boolean {
        return this.authUser?.recommendations?.length > 0;
    }

    get recommendationsNumber(): number {
        return this.hasRecommendations ? this.authUser.recommendations.length : 0;
    }

    updateUser() {
        this.userService.refreshAuthUser().subscribe(response => {
            if (response?.data) {
                this.settings.populate(response.data, this.countrySettings);
            }
            this.cd.markForCheck();
        });
    }

    toAskForRecommendation() {
        this.navigationService.navigate(RouteType.recommendations);
        this.trackingService.trackPromptClickEvent(PromptEvents.recommendationProfileSettings);
    }

    saveAvailability(availability: UserAvailabilityInterface) {
        if (!availability) {
            return;
        }

        this.trackCtaEvent('select_myprofile-select_availabilitymatrix', EventAction.myProfileMenu, true, false);
        this.saveField('availability', availability);
        if (!this.authUser.isAvailable) {
            this.showAvailabilityEmptyDialog();
        }
        this.cd.markForCheck();
    }

    onAdditionalAvailabilityChanged(event: Event) {
        const inputName = (event.target as HTMLInputElement).name;
        if (inputName === 'isAvailableRegularly') {
            this.trackCtaEvent('select_myprofile-select_offerregular', EventAction.myProfileMenu, true, false);
        } else if (inputName === 'isAvailableOccasionally') {
            this.trackCtaEvent('select_myprofile-select_offeroccasional', EventAction.myProfileMenu, true, false);
        } else if (inputName === 'isAvailableAfterSchool') {
            this.trackCtaEvent('select_myprofile-select_offerafterschool', EventAction.myProfileMenu, true, false);
        }

        this.save(event);
        if (!this.authUser.isAvailable) {
            this.showAvailabilityEmptyDialog();
        }
    }

    showInfoDialog() {
        this.navigationService.navigate(RouteType.recommendations, { screen: RecommendationScreen.info });
    }

    onLanguageChange() {
        const checked = this.languageInputs.filter(item => item.nativeElement.checked).map(item => item.nativeElement.value);
        if (this.otherLanguageInput.nativeElement.value !== 'undefined') {
            checked.push(this.otherLanguageInput.nativeElement.value);
        }

        this.saveField('languages', checked);
    }

    onSkillChange() {
        const checked = this.skillInputs.filter(item => item.nativeElement.checked).map(item => item.nativeElement.value);
        this.saveField('skills', checked);
    }

    onTraitChange() {
        const values = this.traitInputs
            .filter(item => allFosterTraits.includes(item.nativeElement.value as never))
            .map(item => item.nativeElement.value);
        this.saveField('traits', values);
    }

    onAgeGroupChange() {
        const ageGroupExperience: Record<string, boolean> = {};
        this.ageGroupInputs.forEach(item => {
            ageGroupExperience[`${item.nativeElement.value}`] = item.nativeElement.checked;
        });
        this.saveField('ageGroupExperience', ageGroupExperience);
    }

    onChoresChange() {
        const fosterChores: Record<string, boolean> = {};
        this.choresInputs.forEach(item => {
            fosterChores[`${item.nativeElement.value}`] = item.nativeElement.checked;
        });
        this.saveField('fosterChores', fosterChores);
    }

    showDeleteReferenceOverlay(reference: Reference) {
        this.overlayService.openOverlay(StandardOverlayComponent, {
            title: 'main.areYouSure',
            message: 'settings.removeReferenceConfirm.format',
            messageArgs: { family: reference?.familyName ?? '' },
            primaryBtn: { title: 'main.yesDelete', action: () => this.removeReference(reference) },
            secondaryBtn: { title: 'main.noBack' },
        });
    }

    editReference(reference: Reference) {
        const overlay = this.overlayService.openOverlay(EditReferenceComponent);
        overlay.reference = reference;
        overlay.saved.subscribe(() => {
            this.overlayService.closeAll();
            this.userService.refreshAuthUser().subscribe();
        });
    }

    private removeReference(reference: Reference) {
        this.authUser.references.forEach((value, index) => {
            if (value.id === reference?.id) {
                this.authUser.references.splice(index, 1);
            }
        });

        if (reference) {
            this.referenceService.removeReference(reference.id).subscribe(() => this.updateUser());
        }
    }

    private showAvailabilityEmptyDialog() {
        this.overlayService.openOverlay(StandardOverlayComponent, {
            title: 'settings.emptyAvailabilityTitle',
            message: 'settings.emptyAvailabilityWarning',
            secondaryBtn: { title: 'main.close' },
        });
    }
}
