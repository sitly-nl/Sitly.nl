import { Component, Output, EventEmitter, ViewChild, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { BaseComponent } from 'app/components/base.component';
import { PlaceAddressComponent } from 'app/models/api/place-address-component';
import { ProvinceAddressComponent } from 'app/models/api/province-address-component';
import { StreetAddressComponent } from 'app/models/api/street-address-component';
import { MapBounds } from 'app/models/generic-types';
import { AddressSuggestionService } from 'modules/edit-address/address.suggestion.service';
import { Error } from 'app/services/api/api.service';
import { Observable, of } from 'rxjs';
import { debounceTime, switchMap, map, catchError, finalize, tap } from 'rxjs/operators';
import MapAddressComponent from 'modules/edit-address/map-address/map-address.component';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { SharedModule } from 'modules/shared/shared.module';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { GA4ElementCategories } from 'app/services/tracking/types';

export type AddressError = Error<{ meta?: { placeBounds?: MapBounds } }>;
export type PostalCodeError = Error<{ title: string }>;

@Component({
    standalone: true,
    selector: 'edit-address',
    templateUrl: './edit-address.component.html',
    styleUrls: ['./edit-address.component.less'],
    imports: [MapAddressComponent, NgxMaskDirective, SharedModule, MatAutocompleteModule, MatSelectModule, ReactiveFormsModule],
    providers: provideNgxMask(),
})
export class EditAddressComponent extends BaseComponent {
    readonly suggestionService = inject(AddressSuggestionService);

    readonly trackCategory = input<GA4ElementCategories>('N/A');
    readonly prefill = input<boolean>(true);

    @Output() addressChanged = new EventEmitter();
    @Output() loading = new EventEmitter();

    @ViewChild(MapAddressComponent, { static: false }) mapAddressComponent: MapAddressComponent;

    readonly postalCodeLoading = signal(false);
    readonly placeValidated = signal(false);
    readonly streetValidated = signal(false);

    addressForm: FormGroup<{
        place: FormControl<string | null>;
        street: FormControl<string | null>;
        houseNumber: FormControl<string | null>;
        postalCode: FormControl<string | null>;
        province: FormControl<string | null>;
    }>;

    get place() {
        return this.addressForm.controls.place;
    }
    get street() {
        return this.addressForm.controls.street;
    }
    get houseNumber() {
        return this.addressForm.controls.houseNumber;
    }
    get postalCode() {
        return this.addressForm.controls.postalCode;
    }
    get province() {
        return this.addressForm.controls.province;
    }

    showMap = false;
    mapBounds: MapBounds;

    placeSuggestions: Observable<PlaceAddressComponent[]>;
    streetSuggestions: Observable<StreetAddressComponent[]>;
    provinces: ProvinceAddressComponent[] = [];

    get emptySuggestions() {
        return of({ data: [] });
    }
    get emptyStreetsComponent() {
        return of([{} as StreetAddressComponent]);
    }
    get config() {
        return this.countrySettings.addressComponents;
    }
    get postalCodeMask() {
        return this.config.postalCode?.maskRegExp?.replace(/\\d/g, '0');
    }
    get streetLabel() {
        return this.config.buildingNumber?.show === 'default'
            ? 'address.addressLine1'
            : (this.street.value?.length ?? 0) > 0
              ? 'address.street.labelShort'
              : 'address.street.label';
    }

    private streetsByPostalCode: StreetAddressComponent[] = [];

    ngOnInit() {
        this.placeValidated.set(this.prefill() && !!this.authUser.placeName);
        this.streetValidated.set(this.prefill() && !!this.authUser.streetName);

        this.addressForm = new FormGroup({
            place: new FormControl(this.prefill() ? this.authUser.placeName : ''),
            street: new FormControl(this.prefill() ? this.authUser.streetName : ''),
            houseNumber: new FormControl(this.prefill() ? (this.authUser.houseNumber ?? '') : ''),
            postalCode: new FormControl(this.prefill() ? this.authUser.postalCode : ''),
            province: new FormControl(''),
        });

        this.placeSuggestions = this.place.valueChanges.pipe(
            tap(_ => {
                this.place.setErrors(null);
                this.placeValidated.set(false);
            }),
            debounceTime(300),
            switchMap(query =>
                query ? this.suggestionService.lookupPlaceName(query, this.province.value ?? undefined) : this.emptySuggestions,
            ),
            map(res => res.data),
            tap(res => this.placeValidated.set(res.some(item => item.name.toLowerCase() === this.place.value?.toLowerCase()))),
        );
        this.streetSuggestions = this.street.valueChanges.pipe(
            tap(_ => {
                this.street.setErrors(null);
                this.streetValidated.set(false);
            }),
            debounceTime(300),
            map(value => value ?? ''),
            switchMap(query =>
                !query || !this.place.value
                    ? this.emptySuggestions
                    : this.suggestionService.lookupStreetName(query, this.place.value, this.province.value ?? undefined),
            ),
            map(res => {
                return res.data.length > 0
                    ? res.data
                    : this.streetsByPostalCode.filter(item => item.name?.toLowerCase().startsWith(this.street.value?.toLowerCase() ?? ''));
            }),
            tap(res => {
                this.streetValidated.set(
                    res.some(item => item.name.toLowerCase() === this.street.value?.toLowerCase()) ||
                        this.streetsByPostalCode.some(item => item.name === this.street.value),
                );
            }),
        );

        const postalCodeConfig = this.config.postalCode;
        if (postalCodeConfig?.show === 'separate-screen') {
            this.postalCode.valueChanges.pipe(debounceTime(500)).subscribe(value => this.getPlaceByPostalCode(value));
        }

        if (!this.config.city?.editable) {
            this.place.disable();
        }

        if (!this.config.street?.editable) {
            this.street.disable();
        }

        if (!this.config.province?.editable) {
            this.province.disable();
        } else {
            this.suggestionService.getProvinces().subscribe(response => {
                this.provinces = response.data;
                if (this.authUser.province) {
                    this.addressForm.controls.province.setValue(
                        this.provinces.find(item => item.name === this.authUser.province)?.name ?? '',
                    );
                }
                this.cd.markForCheck();
            });
        }
    }

    useCurrentLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    // TODO: new-registration display some error message when address not found
                    this.suggestionService
                        .getAddressByCoordinates(position.coords.latitude, position.coords.longitude)
                        .subscribe(response => this.onAddressReceived(response.data));
                },
                error => {
                    // TODO: new-registration display some error message
                    // something weird happened, maybe tunnel or something else?
                    alert(error.message);
                },
            );
        }
    }

    saveAddress() {
        let userData;
        if (this.showMap) {
            if (!this.mapAddressComponent.selectedAddress) {
                return;
            }
            userData = {
                placeName: this.mapAddressComponent.selectedAddress.placeName,
                streetName: this.mapAddressComponent.selectedAddress.streetName,
                houseNumber: this.mapAddressComponent.selectedAddress.houseNumber,
                postalCode: this.mapAddressComponent.selectedAddress.postalCode,
                latitude: this.mapAddressComponent.selectedAddress.latitude,
                longitude: this.mapAddressComponent.selectedAddress.longitude,
            };
        } else {
            if (this.config.postalCode?.show === 'separate-screen' && !this.postalCode.value) {
                this.postalCode.setErrors({ required: true });
            }

            if (!this.place.value) {
                this.place.setErrors([{ required: true }]);
            }

            if (!this.street.value) {
                this.street.setErrors([{ required: true }]);
            }

            if (this.place.errors || this.street.errors) {
                return;
            }

            userData = {
                ...(this.place.value ? { placeName: this.place.value } : {}),
                ...(this.street.value ? { streetName: this.street.value } : {}),
                ...(this.houseNumber.value ? { houseNumber: this.houseNumber.value } : {}),
                ...(this.postalCode.value ? { postalCode: this.postalCode.value } : {}),
            };
        }

        this.loading.emit(true);
        this.userService
            .saveUser(userData)
            .pipe(finalize(() => this.loading.emit(false)))
            .subscribe(
                _ => this.addressChanged.emit(null),
                (error: AddressError) => this.onAddressSaveError(error),
            );
    }

    private getPlaceByPostalCode(value: string | null) {
        this.postalCodeLoading.set(true);
        this.cd.markForCheck();

        this.suggestionService
            .getAddressByPostalCode(value ?? '')
            .pipe(
                map(response => response.data),
                catchError((error: PostalCodeError) => {
                    this.postalCode.setErrors({ not_found: error.error?.errors?.[0].title });
                    return this.emptyStreetsComponent;
                }),
                finalize(() => {
                    this.postalCodeLoading.set(false);
                    this.cd.markForCheck();
                }),
            )
            .subscribe(streets => {
                this.streetsByPostalCode = streets;
                this.onAddressReceived(streets[0]);
            });
    }

    private onAddressReceived(address?: StreetAddressComponent) {
        this.place.setValue(address?.placeName ?? null);
        this.placeValidated.set(!!this.place.value);

        this.street.setValue(!address?.isSuggestion ? (address?.streetName ?? null) : null);
        this.streetValidated.set(!!this.street.value);
        if (!this.street.value) {
            this.street.enable();
        }

        this.houseNumber.setValue(address?.houseNumber ?? null);

        if (this.config.postalCode?.show !== 'separate-screen' || address?.postalCode) {
            this.postalCode.setValue(address?.postalCode ?? null, { emitEvent: false });
        }
        this.province.setValue(address?.province ?? null);
    }

    private onAddressSaveError(error: AddressError) {
        this.mapBounds = error.error?.errors?.[0]?.meta?.placeBounds ?? this.countrySettings.countryBounds;
        this.showMap = true;
        this.cd.markForCheck();
    }
}
