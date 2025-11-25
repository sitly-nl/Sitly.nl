import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RegistrationRoutingModule } from 'registration/registration-routing.module';
import { RegistrationComponent } from 'registration/components/registration/registration.component';
import { RegistrationProgressComponent } from 'registration/components/progress/registration-progress.component';
import { RegistrationRoleComponent } from 'registration/components/steps/shared/role/registration-role.component';
import { RegistrationGenderBirthdayComponent } from 'registration/components/steps/foster/gender-birthday/registration-gender-birthday.component';
import { RegistrationAddressComponent } from 'registration/components/steps/shared/address/registration-address.component';
import { RegistrationFosterRoleComponent } from 'registration/components/steps/foster/foster-role/registration-foster-role.component';
import { RegistrationChildrenComponent } from 'registration/components/steps/parent/children/registration-children.component';
import { RegistrationTranslateService } from 'registration/services/registration-translate.service';
import { RegistrationPageContainerComponent } from 'registration/components/page-container/registration-page-container.component';
import { RegistrationPhotoComponent } from 'registration/components/steps/shared/photo/registration-photo.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'modules/shared/shared.module';
import { MatDialogModule } from '@angular/material/dialog';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { RegistrationEditChildComponent } from 'registration/components/steps/parent/children/edit/registration-edit-child.component';
import { DateFnsModule } from 'ngx-date-fns';
import { EditAddressComponent } from 'modules/edit-address/edit-address.component';
import { RegistrationAvailabilityTypeComponent } from 'registration/components/steps/shared/availability/type/registration-availability-type.component';
import { RegistrationAvailabilityScheduleComponent } from 'registration/components/steps/shared/availability/schedule/registration-availability-schedule.component';
import { RegistrationChoresComponent } from 'registration/components/steps/parent/chores/registration-chores.component';
import { RegistrationAddLaterComponent } from 'registration/components/steps/shared/photo/add-later/registration-add-later.component';
import { RegistrationWillingToPayComponent } from 'registration/components/steps/parent/willing-to-pay/registration-willing-to-pay.component';
import { RegistrationAboutComponent } from 'registration/components/steps/shared/about/registration-about.component';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { RegistrationExperienceYearsComponent } from 'registration/components/steps/foster/experience-years/registration-experience-years.component';
import { RegistrationExperienceAgeGroupsComponent } from 'registration/components/steps/foster/experience-age-groups/registration-experience-age-groups.component';
import { RegistrationReferencesComponent } from 'registration/components/steps/foster/references/registration-references.component';
import { RegistrationNativeLanguageComponent } from 'registration/components/steps/foster/native-language/registration-native-language.component';
import { RegistrationOtherLanguagesComponent } from 'registration/components/steps/foster/other-languages/registration-other-languages.component';
import { RegistrationChildrenAmountComponent } from 'registration/components/steps/foster/children-amount/registration-children-amount.component';
import { RegistrationAdditionalOptionsComponent } from 'registration/components/steps/foster/additional-options/registration-additional-options.component';
import { RegistrationHourlyRateComponent } from 'registration/components/steps/foster/hourly-rate/registration-hourly-rate.component';
import { RegistrationFosterTraitsComponent } from 'registration/components/steps/foster/foster-traits/registration-foster-traits.component';
import { RegistrationEmailComponent } from 'registration/components/steps/shared/email/registration-email.component';
import { PhotoEditorComponent } from 'modules/photo-editor/photo-editor.component';
import { translateModuleConfig } from 'app/services/translation.service';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { RegistrationService } from 'registration/services/registration.service';
import { RegistrationOverlayService } from 'registration/services/registration-overlay.service';
import { DateFormatAdapter } from 'registration/services/date-format-adapter';

@NgModule({
    imports: [
        SharedModule,
        FormsModule,
        ReactiveFormsModule,
        RegistrationRoutingModule,
        MatDialogModule,
        MatBottomSheetModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatAutocompleteModule,
        DateFnsModule,
        TranslateModule.forChild(translateModuleConfig(RegistrationTranslateService)),
        EditAddressComponent,
        PhotoEditorComponent,
        RegistrationComponent,
        RegistrationProgressComponent,
        RegistrationEmailComponent,
        RegistrationRoleComponent,
        RegistrationGenderBirthdayComponent,
        RegistrationAddressComponent,
        RegistrationFosterRoleComponent,
        RegistrationChildrenComponent,
        RegistrationPageContainerComponent,
        RegistrationEditChildComponent,
        RegistrationAvailabilityTypeComponent,
        RegistrationAvailabilityScheduleComponent,
        RegistrationChoresComponent,
        RegistrationPhotoComponent,
        RegistrationAddLaterComponent,
        RegistrationWillingToPayComponent,
        RegistrationAboutComponent,
        RegistrationExperienceYearsComponent,
        RegistrationExperienceAgeGroupsComponent,
        RegistrationReferencesComponent,
        RegistrationNativeLanguageComponent,
        RegistrationOtherLanguagesComponent,
        RegistrationChildrenAmountComponent,
        RegistrationAdditionalOptionsComponent,
        RegistrationHourlyRateComponent,
        RegistrationFosterTraitsComponent,
    ],
    providers: [
        RegistrationService,
        RegistrationOverlayService,
        { provide: DateAdapter, useClass: DateFormatAdapter, deps: [MAT_DATE_LOCALE] },
    ],
})
export default class RegistrationModule {}
