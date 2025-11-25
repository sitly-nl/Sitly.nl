import { PlaceAddressComponent } from 'app/models/api/place-address-component';
import { ProvinceAddressComponent } from 'app/models/api/province-address-component';
import { ResponseParser } from 'app/parsers/response-parser';
import { ApiService } from 'app/services/api/api.service';
import { Injectable, inject } from '@angular/core';
import { StreetAddressComponent } from 'app/models/api/street-address-component';
import { map } from 'rxjs/operators';

@Injectable({
    providedIn: 'root',
})
export class AddressSuggestionService {
    private readonly apiService = inject(ApiService);

    getProvinces() {
        return this.apiService
            .get('/address-components/provinces')
            .pipe(map(response => ResponseParser.parseObject<ProvinceAddressComponent[]>(response)));
    }

    lookupPlaceName(query: string, province?: string) {
        return this.apiService
            .get('/address-components/places', {
                params: {
                    filter: province ? { keyword: query, province } : { keyword: query },
                },
            })
            .pipe(map(response => ResponseParser.parseObject<PlaceAddressComponent[]>(response)));
    }

    lookupStreetName(query: string, place: string, province?: string) {
        return this.apiService
            .get('/address-components/streets', {
                params: {
                    filter: province ? { keyword: query, place, province } : { keyword: query, place },
                },
            })
            .pipe(map(response => ResponseParser.parseObject<StreetAddressComponent[]>(response)));
    }

    getAddressByCoordinates(latitude: number, longitude: number) {
        const params = { filter: { latitude, longitude } };
        return this.apiService
            .get('/address-components/', { params })
            .pipe(map(response => ResponseParser.parseObject<StreetAddressComponent>(response)));
    }

    getAddressByPostalCode(query: string) {
        const params = { filter: { 'postal-code': query } };
        return this.apiService.get('/address-components/streets', { params }).pipe(
            map(response => (Array.isArray(response.data) ? response : { data: [response.data], included: [] })),
            map(response => ResponseParser.parseObject<StreetAddressComponent[]>(response)),
        );
    }
}
