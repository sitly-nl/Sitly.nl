import { inject, Component, Input } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Child, allChildTraits } from 'app/models/api/child';
import { Gender } from 'app/models/api/user';
import { ChildService } from 'app/services/api/child.service';
import { add, sub } from 'date-fns';
import { RegistrationBaseComponent } from 'registration/components/registration-base.component';
import { switchMap } from 'rxjs/operators';
import { TranslateModule } from '@ngx-translate/core';
import { MatDatepickerInput, MatDatepickerToggle, MatDatepicker } from '@angular/material/datepicker';
import { MatInput } from '@angular/material/input';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatButtonToggleGroup, MatButtonToggle } from '@angular/material/button-toggle';
import { SharedModule } from 'modules/shared/shared.module';
import { DateInputDirective } from 'registration/directives/date-input.directive';
import { ResponsiveButton } from 'app/components/common/overlay-content/types';

export type AddChildType = 'unborn' | 'born';

@Component({
    selector: 'registration-edit-child',
    templateUrl: './registration-edit-child.component.html',
    styleUrls: ['./registration-edit-child.component.less'],
    standalone: true,
    imports: [
        SharedModule,
        MatButtonToggleGroup,
        FormsModule,
        ReactiveFormsModule,
        MatButtonToggle,
        MatFormField,
        MatLabel,
        MatInput,
        MatDatepickerInput,
        MatDatepickerToggle,
        MatSuffix,
        MatDatepicker,
        TranslateModule,
        DateInputDirective,
    ],
})
export class RegistrationEditChildComponent extends RegistrationBaseComponent {
    readonly childService = inject(ChildService);

    get child() {
        return this._child;
    }
    @Input() set child(value: Child | undefined) {
        this._child = value;
        if (value) {
            if (value.birthdate) {
                this.birthdateControl.setValue(new Date(value.birthdate));
            }
            this.genderControl.setValue(value.gender);
            this.traits.forEach(item => {
                item.selected = value?.traits.includes(item.value) ?? false;
            });
            this.updateTraitsState();
        }
    }

    get type() {
        return this._type;
    }
    @Input() set type(value: AddChildType) {
        this._type = value;
        if (value === 'born') {
            this.minDate = sub(new Date(), { years: 14 });
            this.maxDate = new Date();
        } else {
            this.minDate = new Date();
            this.maxDate = add(new Date(), { months: 9 });
        }
    }

    get buttons() {
        const result: ResponsiveButton[] = [];
        result.push({
            title: this.child?.id ? 'main.save' : this.type === 'unborn' ? 'children.expecting.cta' : 'children.add.cta',
            action: () => this.onSaveClicked(),
            trackLabel: { category: 'registration', type: 'button', description: 'child-save' },
            type: 'primary',
        });
        if (this.child?.id && this.authUser.children.length > 1) {
            result.push({
                title: 'main.delete',
                action: () => this.onDeleteClicked(),
                trackLabel: { category: 'registration', type: 'button', description: 'child-delete' },
                type: 'thirdly',
            });
        }
        return result;
    }

    traits = allChildTraits.map(item => {
        return { value: item, selected: false };
    });
    minDate: Date;
    maxDate: Date;
    disableTraitSelection = false;
    birthdateControl = new FormControl<Date | null>(null, {
        updateOn: 'blur',
    });
    genderControl = new FormControl<Gender>(Gender.female, { nonNullable: true });

    private _type: AddChildType;
    private _child?: Child;

    onTraitChange(item: { value: string; selected: boolean }) {
        item.selected = !item.selected;
        this.updateTraitsState();
    }

    onSaveClicked() {
        if (!this.birthdateControl.value) {
            return this.birthdateControl.setErrors({ required: true });
        } else if (this.birthdateControl.value < this.minDate) {
            return this.birthdateControl.setErrors({ matDatepickerMin: true });
        } else if (this.birthdateControl.value > this.maxDate) {
            return this.birthdateControl.setErrors({ matDatepickerMax: true });
        }

        const child = this.child ?? new Child();
        child.birthdate = this.birthdateControl.value.toISOString();

        if (this.type === 'unborn') {
            child.gender = Gender.unknown;
        } else {
            child.gender = this.genderControl.value;
            child.traits = this.traits.filter(item => item.selected).map(item => item.value);
        }

        (this.child?.id ? this.childService.updateChild(child) : this.childService.createChild(child))
            .pipe(switchMap(_ => this.userService.refreshAuthUser()))
            .subscribe(() => this.registrationService.updateNextButtonShowState());
        this.overlayService.closeAll();
    }

    onDeleteClicked() {
        if (this.child) {
            this.authUser.children.splice(this.authUser.children.indexOf(this.child), 1);
            this.childService
                .deleteChild(this.child)
                .pipe(switchMap(_ => this.userService.refreshAuthUser()))
                .subscribe();
            this.overlayService.closeAll();
        }
    }

    private updateTraitsState() {
        const count = this.traits.reduce((acc, value) => acc + (value.selected ? 1 : 0), 0);
        this.disableTraitSelection = count >= 3;
    }
}
