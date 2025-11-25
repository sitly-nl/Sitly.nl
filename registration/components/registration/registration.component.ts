import { Component } from '@angular/core';
import { RegistrationBaseComponent } from 'registration/components/registration-base.component';
import { RouterOutlet } from '@angular/router';
import { slide } from 'routing/animations';
import { transition, trigger } from '@angular/animations';
import { RegistrationService } from 'registration/services/registration.service';
import { takeUntil } from 'rxjs/operators';
import { RegistrationSubRouteType } from 'registration/registration-route-type';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';
import { RegistrationProgressComponent } from 'registration/components/progress/registration-progress.component';

const registrationTransitions = [
    ...Array.from({ length: RegistrationService.allParentSteps.length - 1 }).map((_, index) => {
        return [
            transition(
                `${RegistrationService.allParentSteps[index].type} => ${RegistrationService.allParentSteps[index + 1].type}`,
                slide(true, true),
            ),
            transition(
                `${RegistrationService.allParentSteps[index + 1].type} => ${RegistrationService.allParentSteps[index].type}`,
                slide(false, true),
            ),
            transition(`${RegistrationSubRouteType.availabilityType} => ${RegistrationSubRouteType.chores}`, slide(true, true)),
            transition(`${RegistrationSubRouteType.chores} => ${RegistrationSubRouteType.availabilityType}`, slide(false, true)),
        ];
    }),
    ...Array.from({ length: RegistrationService.allFosterSteps.length - 1 }).map((_, index) => {
        return [
            transition(
                `${RegistrationService.allFosterSteps[index].type} => ${RegistrationService.allFosterSteps[index + 1].type}`,
                slide(true, true),
            ),
            transition(
                `${RegistrationService.allFosterSteps[index + 1].type} => ${RegistrationService.allFosterSteps[index].type}`,
                slide(false, true),
            ),
            transition(`${RegistrationSubRouteType.experienceYears} => ${RegistrationSubRouteType.references}`, slide(true, true)),
            transition(`${RegistrationSubRouteType.references} => ${RegistrationSubRouteType.experienceYears}`, slide(false, true)),
        ];
    }),
].flatMap(item => item);

@Component({
    selector: 'registration',
    templateUrl: './registration.component.html',
    styleUrls: ['./registration.component.less'],
    animations: [trigger('routeAnimations', registrationTransitions)],
    standalone: true,
    imports: [RegistrationProgressComponent, RouterOutlet, SharedModule, TranslateModule],
})
export class RegistrationComponent extends RegistrationBaseComponent {
    ngOnInit() {
        this.registrationService.setNextShown.pipe(takeUntil(this.destroyed$)).subscribe(_ => {
            this.cd.markForCheck();
        });
    }

    prepareRoute(outlet: RouterOutlet) {
        return outlet?.activatedRouteData?.animation as unknown;
    }

    onNextClick(component: unknown) {
        (component as RegistrationBaseComponent).handleNextClick();
    }

    onBackClick(component: unknown) {
        (component as RegistrationBaseComponent).handleBackClick();
    }
}
