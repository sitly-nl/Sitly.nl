import { Component, Input, Output, EventEmitter } from '@angular/core';
import { BaseOverlayComponent } from 'app/components/common/overlay-content/base-overlay.component';
import { Country } from 'app/models/api/country';
import { SharedModule } from 'modules/shared/shared.module';

@Component({
    selector: 'country-picker-overlay',
    templateUrl: './country-picker-overlay.component.html',
    styleUrls: ['./country-picker-overlay.component.less'],
    standalone: true,
    imports: [SharedModule],
})
export class CountryPickerOverlayComponent extends BaseOverlayComponent {
    @Input() countries: Country[];
    @Output() countrySelected = new EventEmitter<Country>();

    ngOnInit() {
        this.data.set({
            title: 'countryPickerOverlay.title',
            message: 'countryPickerOverlay.message',
        });
    }
}
