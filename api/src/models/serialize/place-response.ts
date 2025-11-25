import { Place } from '../place.model';

export class PlaceResponse {
    static keys: (keyof PlaceResponse)[] = ['id', 'name'];

    id = this.place.place_url;
    name = this.place.place_name;

    private constructor(private place: Place) {}

    static instance(place: Place) {
        return new PlaceResponse(place);
    }
}
