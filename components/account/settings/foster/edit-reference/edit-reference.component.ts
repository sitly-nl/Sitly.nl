import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, inject } from '@angular/core';
import { BaseOverlayComponent } from 'app/components/common/overlay-content/base-overlay.component';
import { Reference } from 'app/models/api/reference';
import { ReferenceService } from 'app/services/api/reference.service';
import { TranslateModule } from '@ngx-translate/core';
import { MatInput } from '@angular/material/input';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { SharedModule } from 'modules/shared/shared.module';

@Component({
    selector: 'edit-reference',
    templateUrl: './edit-reference.component.html',
    styleUrls: ['./edit-reference.component.less'],
    standalone: true,
    imports: [SharedModule, MatFormField, MatLabel, MatInput, TranslateModule],
})
export class EditReferenceComponent extends BaseOverlayComponent {
    readonly referenceService = inject(ReferenceService);

    @ViewChild('description') private descriptionField?: ElementRef<HTMLTextAreaElement>;
    @ViewChild('name') private nameField?: ElementRef<HTMLInputElement>;
    @Output() saved = new EventEmitter();

    @Input() reference?: Reference;

    showNameError = false;
    showDescriptionError = false;

    private get isNameValid() {
        return this.name.length >= 3 && this.name.length <= 50;
    }
    private get isDescriptionValid() {
        return this.description.length >= 40 && this.description.length <= 600;
    }
    private get name() {
        return this.nameField?.nativeElement.value ?? '';
    }
    private get description() {
        return this.descriptionField?.nativeElement.value ?? '';
    }

    ngOnInit() {
        this.data.set({
            title: 'settings.editReference',
            secondaryBtn: { title: 'main.cancel' },
            primaryBtn: { title: 'main.save', action: () => this.save(), stayOpenOnClick: true },
        });
    }

    save() {
        if (!this.isNameValid || !this.isDescriptionValid) {
            return;
        }

        this.referenceService
            .editReference({ id: this.reference?.id, familyName: this.name, description: this.description })
            .subscribe(() => this.saved.emit());
    }

    onTextChanged() {
        this.showNameError = !this.isNameValid;
        this.showDescriptionError = !this.isDescriptionValid;
    }
}
