import { BaseParser } from 'app/parsers/base-parser';
import { ServerResponseData } from 'app/models/api/response';
import { ParserMap } from 'app/parsers/response-parser';
import { PlaceAddressComponent } from 'app/models/api/place-address-component';

export class PlaceAddressComponentParser extends BaseParser {
    parse(data: ServerResponseData, _included: ServerResponseData[], _parsersMap: ParserMap) {
        return super.parseBase(PlaceAddressComponent, data);
    }
}
