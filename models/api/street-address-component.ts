import { BaseApiModel } from 'app/models/api/response';

export class StreetAddressComponent extends BaseApiModel {
    name: string;
    placeName: string;
    houseNumber?: string;
    streetName?: string;
    postalCode?: string;
    province?: string;
    found?: boolean;
    isSuggestion?: boolean;
    longitude?: number;
    latitude?: number;
}
