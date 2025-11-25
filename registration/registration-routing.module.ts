import { Component, NgModule, Type, inject } from '@angular/core';
import { ActivatedRouteSnapshot, Route, Router, RouterModule, RouterStateSnapshot, Routes } from '@angular/router';
import { RegistrationRoleComponent } from 'registration/components/steps/shared/role/registration-role.component';
import { RegistrationGenderBirthdayComponent } from 'registration/components/steps/foster/gender-birthday/registration-gender-birthday.component';
import { RegistrationAddressComponent } from 'registration/components/steps/shared/address/registration-address.component';
import { RegistrationChildrenComponent } from 'registration/components/steps/parent/children/registration-children.component';
import { RegistrationFosterRoleComponent } from 'registration/components/steps/foster/foster-role/registration-foster-role.component';
import { RegistrationComponent } from 'registration/components/registration/registration.component';
import { RegistrationSubRouteType } from 'registration/registration-route-type';
import { RegistrationAvailabilityTypeComponent } from 'registration/components/steps/shared/availability/type/registration-availability-type.component';
import { RegistrationAvailabilityScheduleComponent } from 'registration/components/steps/shared/availability/schedule/registration-availability-schedule.component';
import { RegistrationChoresComponent } from 'registration/components/steps/parent/chores/registration-chores.component';
import { RegistrationPhotoComponent } from 'registration/components/steps/shared/photo/registration-photo.component';
import { RegistrationWillingToPayComponent } from 'registration/components/steps/parent/willing-to-pay/registration-willing-to-pay.component';
import { RegistrationAboutComponent } from 'registration/components/steps/shared/about/registration-about.component';
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
import { UserService } from 'app/services/user.service';
import { RegistrationService } from 'registration/services/registration.service';
import { SessionService } from 'app/services/session.service';
import { DefaultRouteService } from 'routing/guards/default-route.service';
import { map } from 'rxjs/operators';
import { StorageService } from 'app/services/storage.service';

const RegistrationAuthGuard = (_next: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    const userService = inject(UserService);
    const sessionService = inject(SessionService);
    const defaultRouteService = inject(DefaultRouteService);
    const storageService = inject(StorageService);
    const router = inject(Router);

    if (state.url.startsWith('/complete/start')) {
        if (userService.authUser && !storageService.countryCode) {
            return defaultRouteService.createDefaultRoute(state.url);
        }

        const urlTree = router.parseUrl(state.url);
        const segments = urlTree.root.children.primary.segments;
        if (segments.length >= 4) {
            return sessionService
                .startWithUserIdAndTokenCode(segments[2].path, segments[3].path)
                .pipe(map(_ => defaultRouteService.createDefaultRoute(state.url)));
        }
    } else if (state.url.startsWith('/complete/') && userService.authUser?.completed) {
        return defaultRouteService.createDefaultRoute(state.url);
    }

    if (!userService.authUser) {
        sessionService.cleanData();
        return defaultRouteService.createDefaultRoute(state.url);
    }

    if (!userService.authUser?.email && !state.url.endsWith('/email')) {
        return router.createUrlTree(['complete', 'email']);
    }

    const registrationService = inject(RegistrationService);
    const steps = userService.authUser?.isParent ? registrationService.parentSteps : registrationService.fosterSteps;
    const subPath = registrationService.getStepSubpath(state.url);

    if (subPath && steps.some(step => (step.type as never) === subPath)) {
        return true;
    }

    return router.createUrlTree(['complete', 'role']);
};

const route = (type: RegistrationSubRouteType, component: Type<unknown>, pathMatch = 'full', children?: Routes) => {
    return {
        path: type,
        component,
        pathMatch,
        data: { animation: type },
        children,
        canActivate: [RegistrationAuthGuard],
    } as Route;
};

@Component({ selector: 'empty-registration', template: '' })
class EmptyComponent {}

const routes: Routes = [
    {
        path: '',
        component: RegistrationComponent,
        children: [
            { path: '', redirectTo: RegistrationSubRouteType.role, pathMatch: 'full' },
            {
                path: 'start/:userUrl/:tokenCode',
                canActivate: [RegistrationAuthGuard],
                component: EmptyComponent,
            },
            route(RegistrationSubRouteType.email, RegistrationEmailComponent),
            route(RegistrationSubRouteType.role, RegistrationRoleComponent),
            route(RegistrationSubRouteType.address, RegistrationAddressComponent),
            route(RegistrationSubRouteType.children, RegistrationChildrenComponent),
            route(RegistrationSubRouteType.fosterRole, RegistrationFosterRoleComponent),
            route(RegistrationSubRouteType.genderBirthday, RegistrationGenderBirthdayComponent),
            route(RegistrationSubRouteType.availabilityType, RegistrationAvailabilityTypeComponent),
            route(RegistrationSubRouteType.availabilitySchedule, RegistrationAvailabilityScheduleComponent),
            route(RegistrationSubRouteType.chores, RegistrationChoresComponent),
            route(RegistrationSubRouteType.willingToPay, RegistrationWillingToPayComponent),
            route(RegistrationSubRouteType.about, RegistrationAboutComponent),
            route(RegistrationSubRouteType.photo, RegistrationPhotoComponent),
            route(RegistrationSubRouteType.experienceYears, RegistrationExperienceYearsComponent),
            route(RegistrationSubRouteType.experienceAgeGroups, RegistrationExperienceAgeGroupsComponent),
            route(RegistrationSubRouteType.references, RegistrationReferencesComponent),
            route(RegistrationSubRouteType.nativeLanguage, RegistrationNativeLanguageComponent),
            route(RegistrationSubRouteType.otherLanguages, RegistrationOtherLanguagesComponent),
            route(RegistrationSubRouteType.childrenAmount, RegistrationChildrenAmountComponent),
            route(RegistrationSubRouteType.additionalOptions, RegistrationAdditionalOptionsComponent),
            route(RegistrationSubRouteType.hourlyRate, RegistrationHourlyRateComponent),
            route(RegistrationSubRouteType.fosterTraits, RegistrationFosterTraitsComponent),
            { path: '**', redirectTo: RegistrationSubRouteType.role, pathMatch: 'full' },
        ],
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class RegistrationRoutingModule {}
