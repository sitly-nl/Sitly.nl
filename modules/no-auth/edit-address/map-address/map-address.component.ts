import { Component, Input, ViewChild, ElementRef, OnInit, inject } from '@angular/core';
import { BaseComponent } from 'app/components/base.component';
import { MapboxMaps } from 'app/components/search/map/mapbox-maps';
import { StreetAddressComponent } from 'app/models/api/street-address-component';
import { MapBounds } from 'app/models/generic-types';
import { AddressSuggestionService } from 'modules/edit-address/address.suggestion.service';
import { Error } from 'app/services/api/api.service';
import { SharedModule } from 'modules/shared/shared.module';
import { takeUntil, tap, finalize } from 'rxjs/operators';

@Component({
    standalone: true,
    selector: 'map-address',
    templateUrl: './map-address.component.html',
    styleUrls: ['./map-address.component.less'],
    imports: [SharedModule],
})
export default class MapAddressComponent extends BaseComponent implements OnInit {
    readonly addressSuggestionService = inject(AddressSuggestionService);

    @ViewChild('mapContainer', { static: true }) mapContainerRef: ElementRef<HTMLDivElement>;

    @Input({ required: true }) bounds: MapBounds;

    selectedAddress?: StreetAddressComponent;
    error?: string;

    get selectedAddressText() {
        return this.selectedAddress
            ? `${this.selectedAddress.streetName} ${this.selectedAddress.houseNumber}, ${this.selectedAddress.placeName}`
            : '';
    }
    get toastMessageContent() {
        return ['address.selectedAddress', this.selectedAddressText];
    }

    private map: MapboxMaps;

    ngOnInit() {
        this.initMap();
    }

    onMapClicked(lngLat: { lng: number; lat: number }) {
        this.addressSuggestionService
            .getAddressByCoordinates(lngLat.lat, lngLat.lng)
            .pipe(finalize(() => this.cd.markForCheck()))
            .subscribe(
                res => {
                    this.error = undefined;
                    this.selectedAddress = res.data.found ? res.data : undefined;
                },
                (error: Error<{ title: string }>) => {
                    this.selectedAddress = undefined;
                    this.error = error.error?.errors?.[0]?.title;
                },
            );
        this.map.center(lngLat.lng, lngLat.lat, false);
    }

    private initMap() {
        if (this.mapContainerRef?.nativeElement) {
            const mapElement = this.mapContainerRef.nativeElement;
            MapboxMaps.getInstance({
                mapElement,
                options: { bounds: [this.bounds.west, this.bounds.south, this.bounds.east, this.bounds.north] },
                routeService: this.routeService,
            }).then(instance => {
                this.map = instance;
                this.map.clearAll();
                this.map.clicked
                    .pipe(
                        takeUntil(this.destroyed$),
                        tap(lngLat => {
                            this.map.placeClickMarker(lngLat, 'location');
                            this.onMapClicked(lngLat);
                        }),
                    )
                    .subscribe();
            });
        }
    }
}
