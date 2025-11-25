import { SettingsBaseComponent } from 'app/components/settings/settings-base.component';
import { Child } from 'app/models/api/child';
import { inject, Component, ChangeDetectionStrategy, OnInit, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { ChildService } from 'app/services/api/child.service';
import { UserAvailabilityInterface, allFosterChores } from 'app/models/api/user';
import { switchMap, takeUntil } from 'rxjs/operators';
import { ApiService } from 'app/services/api/api.service';
import { EventAction } from 'app/services/tracking/types';
import { ServerResponseData } from 'app/models/api/response';
import { Nl2br } from 'app/pipes/nl2br.pipe';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';
import { FormsModule } from '@angular/forms';
import { FormCheckboxComponent } from 'app/components/common/form/checkbox.component';
import { ChildComponent } from 'app/components/settings/child/child.component';
import { AvailabilityCalendarComponent } from 'app/components/availability-calendar/availability-calendar.component';

@Component({
    selector: 'parent-settings',
    templateUrl: './parent-settings.component.html',
    styleUrls: ['./parent-settings.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [ChildComponent, FormCheckboxComponent, FormsModule, AvailabilityCalendarComponent, SharedModule, TranslateModule, Nl2br],
})
export class ParentSettingsComponent extends SettingsBaseComponent implements OnInit {
    readonly childService = inject(ChildService);
    readonly apiService = inject(ApiService);

    children: Child[] = [];
    newChild = new Child();
    showChildrenForm = false;
    hourlyRates = this.countrySettings.hourlyRateOptions.map(item => {
        return { ...item, checked: false };
    });
    chores = allFosterChores.map(item => {
        return { value: item, checked: false };
    });
    statisticString: string;

    @ViewChildren('hourlyRateInput') hourlyRateInputs: QueryList<ElementRef<HTMLInputElement>>;
    @ViewChildren('choresInput') choresInputs: QueryList<ElementRef<HTMLInputElement>>;

    get canAddMoreChildren() {
        return this.children?.length < 4;
    }

    get childFormInvalid() {
        return !this.newChild.birthdate || !this.newChild.gender;
    }

    ngOnInit() {
        this.settings.populate(this.authUser.deepCopy(), this.countrySettings);
        this.userService.changed.pipe(takeUntil(this.destroyed$)).subscribe(() => {
            this.settings.populate(this.authUser.deepCopy(), this.countrySettings);
            this.util.delay(() => {
                this.cd.detectChanges();
                this.cd.markForCheck();
            }, 100);
            this.populateHourlyRates();
            this.populateChores();
        });
        this.children = this.authUser.children;

        this.apiService.get('/users/me/hourly-rates-statistic').subscribe(response => {
            const text = (response.data as ServerResponseData).attributes.statisticString as string;
            this.statisticString = text.replace(/: ([^\n]+)/gm, (_match, p1: string) => {
                return `: <span class="normal">${p1}</span>`;
            });
            this.cd.markForCheck();
        });

        this.populateHourlyRates();
        this.getNewChild();
    }

    getNewChild() {
        this.newChild = new Child();
    }

    removeChild(child: Child) {
        this.notifySaved();

        this.children = this.children.filter(item => item.id !== child.id);
        const oldUser = this.authUser;
        oldUser.children = this.children;
        this.userService.authUser = oldUser;

        this.childService.deleteChild(child).subscribe();
    }

    saveChild() {
        if (this.newChild.birthdate && this.newChild.gender) {
            this.children.push(this.newChild);
            this.childService
                .createChild(this.newChild)
                .pipe(switchMap(() => this.userService.refreshAuthUser()))
                .subscribe(res => {
                    this.notifySaved();
                    this.children = res.data.children;
                });

            this.getNewChild();
            this.showChildrenForm = false;
        }
    }

    updateChild(child: Child) {
        this.notifySaved();

        this.childService
            .updateChild(child)
            .pipe(switchMap(_ => this.userService.refreshAuthUser()))
            .subscribe(res => {
                this.notifySaved();
                this.children = res.data.children;
            });
    }

    cancelNewChild() {
        this.getNewChild();
        this.showChildrenForm = false;
    }

    saveAvailability(availability: UserAvailabilityInterface) {
        if (!availability) {
            return;
        }
        this.trackCtaEvent('select_myprofile-select_availabilitymatrix', EventAction.myProfileMenu, true, false);
        this.saveField('availability', availability);
        this.cd.markForCheck();
    }

    onAdditionalAvailabilityChanged(event: Event) {
        const inputName = (event.target as HTMLInputElement).name;
        if (inputName === 'lookingForRegularCare') {
            this.trackCtaEvent('select_myprofile-select_needregular', EventAction.myProfileMenu, true, false);
        } else if (inputName === 'lookingForOccasionalCare') {
            this.trackCtaEvent('select_myprofile-select_needoccasional', EventAction.myProfileMenu, true, false);
        } else if (inputName === 'lookingForAfterSchool') {
            this.trackCtaEvent('select_myprofile-select_needafterschool', EventAction.myProfileMenu, true, false);
        }

        this.save(event);
    }

    onHourlyRatesChanged() {
        const values = this.hourlyRateInputs.filter(item => item.nativeElement.checked).map(item => item.nativeElement.value);
        this.saveField('hourlyRatesPreference', values);
    }

    onChoresChanged() {
        const values = this.choresInputs.filter(item => item.nativeElement.checked).map(item => item.nativeElement.value);
        this.saveField('choresPreference', values);
    }

    private populateHourlyRates() {
        this.hourlyRates.forEach(rate => {
            rate.checked = !!this.authUser?.searchPreferences?.hourlyRates?.find(item => item === rate.value);
        });
    }

    private populateChores() {
        this.chores.forEach(option => {
            option.checked = !!this.authUser?.searchPreferences?.chores?.find(item => item === option.value);
        });
    }
}
