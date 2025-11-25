import { map } from 'rxjs/operators';
import { ApiService } from 'app/services/api/api.service';
import { Injectable, inject } from '@angular/core';
import { ResponseParser } from 'app/parsers/response-parser';
import { Country } from 'app/models/api/country';

@Injectable({
    providedIn: 'root',
})
export class CountriesApiService {
    private apiService = inject(ApiService);

    countries() {
        return this.apiService
            .get('/countries', { brandCode: 'main', cachable: true })
            .pipe(map(response => ResponseParser.parseObject<Country[]>(response)));
    }
}
