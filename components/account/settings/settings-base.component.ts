import { BaseComponent } from 'app/components/base.component';
import { Settings } from 'app/components/settings/settings';
import { inject, Output, EventEmitter, Component, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { DatePickerEvent } from 'app/components/common/date-picker/datepicker.component';
import { UtilService } from 'app/services/util.service';

@Component({
    template: '',
})
export class SettingsBaseComponent extends BaseComponent {
    readonly settings = inject(Settings);
    readonly util = inject(UtilService);

    @Output() saved = new EventEmitter();

    @ViewChildren('fosterLocationInput') fosterLocationInputs: QueryList<ElementRef<HTMLInputElement>>;

    get showChildminders() {
        return this.countrySettings.showChildminders;
    }
    about = {
        min: 30,
        max: 1000,
    };

    private requesting = false;
    private queuedItems: (() => void)[] = [];

    save(event: Event | DatePickerEvent) {
        const el = event.target as HTMLInputElement;
        const fieldName = el.name;

        let value: string | number | Date | undefined;
        if (event instanceof Event) {
            if (el.type === 'checkbox') {
                value = el.checked ? 1 : 0;
            } else {
                value = el.value;
                if (fieldName === 'about' && (el.value.length < this.about.min || el.value.length > this.about.max)) {
                    return;
                }
            }
        } else if (fieldName === 'birthdate') {
            value = event.date;
        }

        if (value !== undefined) {
            this.saveField(fieldName, value);
            this.cd.markForCheck();
        }
    }

    saveField(fieldName: string, value: unknown) {
        this.storageService.filters = undefined;

        const save = () => {
            this.requesting = true;

            this.userService
                .saveUser(this.serverRepresentations(fieldName, value))
                .pipe(
                    finalize(() => {
                        this.requesting = false;
                        this.settings.populate(this.authUser, this.countrySettings);
                        this.notifySaved();
                        this.sendNext();
                    }),
                )
                .subscribe(response => {
                    this.settings.populate(response.data, this.countrySettings);
                });
        };

        this.queuedItems.push(save);
        if (!this.requesting) {
            this.sendNext();
        }
    }

    onFosterLocationChange() {
        const fosterLocation: Record<string, boolean> = {};
        this.fosterLocationInputs.forEach(item => {
            fosterLocation[`${item.nativeElement.value}`] = item.nativeElement.checked;
        });
        this.saveField('fosterLocation', fosterLocation);
    }

    notifySaved() {
        this.saved.emit();
    }

    private serverRepresentations(fieldName: string, value: unknown) {
        const postData: Record<string, unknown> = {};
        if (fieldName === 'availability') {
            postData[this.authUser.isParent ? 'availabilityPreference' : 'availability'] = value;
        } else {
            postData[fieldName] = value;
        }
        return postData;
    }

    private sendNext() {
        if (this.queuedItems.length) {
            this.queuedItems.shift()?.();
        }
    }
}
