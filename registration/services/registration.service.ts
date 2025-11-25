import { EventEmitter, Injectable, effect, inject } from '@angular/core';
import { DateAdapter } from '@angular/material/core';
import { Router } from '@angular/router';
import { User, UserRole, YearsExperience } from 'app/models/api/user';
import { CountrySettingsService } from 'app/services/country-settings.service';
import { LocaleService } from 'app/services/locale.service';
import { NavigationService } from 'app/services/navigation.service';
import { RouteService } from 'app/services/route.service';
import { SessionService } from 'app/services/session.service';
import { TrackingService } from 'app/services/tracking/tracking.service';
import { UserService } from 'app/services/user.service';
import { AvailabilityUtils } from 'app/utils/availability-utils';
import { RegistrationSubRouteType } from 'registration/registration-route-type';
import { RegistrationOverlayService } from 'registration/services/registration-overlay.service';
import { finalize } from 'rxjs/operators';

interface RegistrationStep {
    type: RegistrationSubRouteType;
    showNext: (user: User) => boolean;
    customNextBtnLabel?: (user: User) => string;
}

@Injectable()
export class RegistrationService {
    private static readonly emailStep: RegistrationStep = { type: RegistrationSubRouteType.email, showNext: _ => true };
    private static readonly roleStep: RegistrationStep = { type: RegistrationSubRouteType.role, showNext: user => !!user.role };
    private static readonly addressStep: RegistrationStep = { type: RegistrationSubRouteType.address, showNext: _ => true };
    private static readonly availabilityTypeStep: RegistrationStep = {
        type: RegistrationSubRouteType.availabilityType,
        showNext: _ => true,
    };
    private static readonly availabilityScheduleStep: RegistrationStep = {
        type: RegistrationSubRouteType.availabilitySchedule,
        showNext: user => !AvailabilityUtils.isEmpty(user.availability),
    };
    private static readonly aboutStep: RegistrationStep = { type: RegistrationSubRouteType.about, showNext: _ => true };
    private static readonly photoStep: RegistrationStep = {
        type: RegistrationSubRouteType.photo,
        showNext: _ => true,
        customNextBtnLabel: user => (user.photos.length > 0 ? 'photo.cta.finish' : 'photo.cta.addPhoto'),
    };

    static readonly allParentSteps: RegistrationStep[] = [
        RegistrationService.emailStep,
        RegistrationService.roleStep,
        RegistrationService.addressStep,
        { type: RegistrationSubRouteType.children, showNext: user => user.children.length > 0 },
        RegistrationService.availabilityTypeStep,
        RegistrationService.availabilityScheduleStep,
        { type: RegistrationSubRouteType.chores, showNext: _ => true },
        { type: RegistrationSubRouteType.willingToPay, showNext: _ => true },
        RegistrationService.aboutStep,
        RegistrationService.photoStep,
    ];
    static readonly allFosterSteps: RegistrationStep[] = [
        RegistrationService.emailStep,
        RegistrationService.roleStep,
        { type: RegistrationSubRouteType.fosterRole, showNext: user => user.isBabysitter || user.isChildminder },
        { type: RegistrationSubRouteType.genderBirthday, showNext: _ => true },
        RegistrationService.addressStep,
        { type: RegistrationSubRouteType.experienceYears, showNext: user => user.fosterProperties.yearsOfExperience !== null },
        { type: RegistrationSubRouteType.experienceAgeGroups, showNext: _ => true },
        { type: RegistrationSubRouteType.references, showNext: user => user.fosterProperties.hasReferences !== null },
        { type: RegistrationSubRouteType.nativeLanguage, showNext: user => user.fosterProperties.nativeLanguage !== null },
        { type: RegistrationSubRouteType.otherLanguages, showNext: _ => true },
        { type: RegistrationSubRouteType.childrenAmount, showNext: user => user.searchPreferences.maxChildren > 0 },
        { type: RegistrationSubRouteType.additionalOptions, showNext: _ => true },
        { type: RegistrationSubRouteType.hourlyRate, showNext: user => user.fosterProperties.averageHourlyRate !== null },
        RegistrationService.availabilityTypeStep,
        RegistrationService.availabilityScheduleStep,
        { type: RegistrationSubRouteType.fosterTraits, showNext: _ => true },
        RegistrationService.aboutStep,
        RegistrationService.photoStep,
    ];
    stepChanged = new EventEmitter();
    setNextShown = new EventEmitter<boolean>();

    loading = false;

    get progress() {
        // for first step we don't know exact number of steps so we choose bigger one - fosterSteps
        const totalStepsCount = (this.stepIndex === 0 ? this.fosterSteps.length : this.steps.length) + 1;
        return Math.floor((100 * (this.stepIndex + 1)) / totalStepsCount);
    }
    get fosterSteps() {
        return RegistrationService.allFosterSteps.filter(item => {
            if (item.type === RegistrationSubRouteType.experienceAgeGroups) {
                return this.userService.authUser?.fosterProperties?.yearsOfExperience !== YearsExperience.none;
            }
            if (item.type === RegistrationSubRouteType.email) {
                return !this.userService.authUser?.email;
            }
            return this.countrySettingsService.countrySettings?.showChildminders ? true : item.type !== RegistrationSubRouteType.fosterRole;
        });
    }
    get parentSteps() {
        return RegistrationService.allParentSteps.filter(item => {
            if (item.type === RegistrationSubRouteType.availabilitySchedule) {
                return !!this.userService.authUser?.hasRegularCare;
            }
            if (item.type === RegistrationSubRouteType.email) {
                return !this.userService.authUser?.email;
            }
            return true;
        });
    }
    private steps: RegistrationStep[] = [];
    private _step = 0;
    get stepIndex() {
        return this._step;
    }
    set stepIndex(value: number) {
        this.stepChanged.emit();
        this._step = value;
    }
    get currentStep() {
        return this.steps[this.stepIndex];
    }

    private _nextShown = false;
    get nextShown() {
        return this._nextShown;
    }
    set nextShown(value: boolean) {
        if (this._nextShown !== value) {
            this.setNextShown.emit(value);
        }
        this._nextShown = value;
    }

    get nextBtnLabel() {
        return this.userService.authUser && this.currentStep.customNextBtnLabel
            ? this.currentStep.customNextBtnLabel(this.userService.authUser)
            : 'main.next';
    }

    private routeService = inject(RouteService);
    private navigationService = inject(NavigationService);
    private userService = inject(UserService);
    private localeService = inject(LocaleService);
    private countrySettingsService = inject(CountrySettingsService);
    private sessionService = inject(SessionService);
    private registrationOverlayService = inject(RegistrationOverlayService);
    private trackingService = inject(TrackingService);
    private dateAdapter = inject(DateAdapter<Date>);
    private router = inject(Router);

    constructor() {
        if (this.userService.authUser) {
            // Make sure to copy this logic if mat-datepicker will be started using in other modules
            this.dateAdapter.setLocale(this.localeService.getLanguageCode());
            this.trackingService.trackRegistrationStarted(this.userService.authUser.id);
            this.updateSteps();

            effect(() => {
                this.stepIndex = Math.max(
                    this.steps.findIndex(step => (step.type as never) === this.getStepSubpath(this.routeService.currentUrl())),
                    0,
                );
                this.updateNextButtonShowState();
            });
        }
    }

    getStepSubpath(url: string) {
        return this.router.parseUrl(url).root.children.primary.segments.pop()?.path;
    }

    startParentFlow() {
        if (this.userService.authUser) {
            this.userService.authUser.role = UserRole.parent;
        }
        this.userService.saveUser({ role: UserRole.parent }).subscribe();
        this.steps = this.parentSteps;
        this._step = 0;
        this.showNextStep();
    }

    startFosterFlow() {
        if (this.userService.authUser) {
            this.userService.authUser.role = UserRole.babysitter;
        }
        this.userService.saveUser({ role: UserRole.babysitter }).subscribe();
        this.steps = this.fosterSteps;
        this._step = 0;
        this.showNextStep();
    }

    showNextStep() {
        if (this.stepIndex < this.steps.length - 1) {
            this.showStep(this.stepIndex + 1);
        } else {
            this.loading = true;
            this.userService
                .saveUser({
                    completed: true,
                })
                .pipe(finalize(() => (this.loading = false)))
                .subscribe(_ => {
                    this.trackingService.trackRegistration();
                    this.sessionService.navigateToDefaultRoute();
                    this.sessionService.onFirstSession();
                });
        }
    }

    showPreviousStep() {
        if (this.stepIndex > 0) {
            this.showStep(this.stepIndex - 1);
        } else {
            this.registrationOverlayService.showExitRegistrationAlert(() => this.sessionService.signOut());
            this.trackingService.trackElementView({ category: 'registration', type: 'overlay', description: 'exit-alert' });
        }
    }

    updateNextButtonShowState() {
        this.nextShown = this.userService.authUser ? this.currentStep.showNext(this.userService.authUser) : false;
    }

    updateSteps() {
        this.steps = this.userService.authUser?.isParent ? this.parentSteps : this.fosterSteps;
    }

    private showStep(stepIndex: number) {
        this.navigationService.navigateToRegistrationStep(this.steps[stepIndex].type);
    }
}
