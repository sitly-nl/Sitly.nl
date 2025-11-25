import { Child, ChildTraits, allChildTraits } from 'app/models/api/child';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ViewChild, ElementRef } from '@angular/core';
import { Gender } from 'app/models/api/user';
import { DatePickerEvent, DatepickerComponent } from 'app/components/common/date-picker/datepicker.component';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'child',
    templateUrl: 'child.component.html',
    styleUrls: ['./child.component.base.less'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [FormsModule, DatepickerComponent, TranslateModule],
})
export class ChildComponent {
    @Input({ required: true }) child: Child;
    @Input() removeButton = true;

    @Output() childRemoved = new EventEmitter();
    @Output() childUpdated = new EventEmitter<Child>();

    @ViewChild('traitPicker1', { static: false }) traitPicker1: ElementRef<HTMLSelectElement>;
    @ViewChild('traitPicker2', { static: false }) traitPicker2: ElementRef<HTMLSelectElement>;
    @ViewChild('traitPicker3', { static: false }) traitPicker3: ElementRef<HTMLSelectElement>;

    minYear: number = new Date().getFullYear() - 18;
    maxYear: number = new Date().getFullYear();
    Gender = Gender;

    get childBirthDate() {
        return this.child.birthdate ? new Date(this.child?.birthdate).getDate() : undefined;
    }

    get childBirthMonth() {
        return this.child.birthdate ? new Date(this.child?.birthdate).getMonth() + 1 : undefined;
    }

    get childBirthYear() {
        return this.child?.birthdate ? new Date(this.child?.birthdate).getFullYear() : undefined;
    }

    get availableTraits1() {
        return allChildTraits.filter(item => item !== this.trait2 && item !== this.trait3);
    }

    get availableTraits2() {
        return allChildTraits.filter(item => item !== this.trait1 && item !== this.trait3);
    }

    get availableTraits3() {
        return allChildTraits.filter(item => item !== this.trait1 && item !== this.trait2);
    }

    trait1?: ChildTraits;
    trait2?: ChildTraits;
    trait3?: ChildTraits;

    ngOnInit() {
        this.initTraits();
    }

    ngOnChanges() {
        this.initTraits();
    }

    removeChild(child: Child) {
        this.childRemoved.emit(child);
    }

    updateDate(date: DatePickerEvent) {
        this.child.birthdate = date?.date?.toISOString();
        this.childUpdated.emit(this.child);
    }

    updateGender(gender: string) {
        if (!this.child) {
            return;
        }
        this.child.gender = gender as Gender;
        if ((gender as Gender) !== Gender.unknown) {
            this.childUpdated.emit(this.child);
        }
    }

    onTraitChanged() {
        if (!this.child) {
            return;
        }
        this.child.traits = [
            this.traitPicker1.nativeElement.value as ChildTraits,
            this.traitPicker2.nativeElement.value as ChildTraits,
            this.traitPicker3.nativeElement.value as ChildTraits,
        ].filter(item => !!item);
        this.childUpdated.emit(this.child);
    }

    private initTraits() {
        this.trait1 = this.child?.traits?.[0];
        this.trait2 = this.child?.traits?.[1];
        this.trait3 = this.child?.traits?.[2];
    }
}
