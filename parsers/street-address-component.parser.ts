import { BaseParser } from 'app/parsers/base-parser';
import { ServerResponseData } from 'app/models/api/response';
import { ParserMap } from 'app/parsers/response-parser';
import { StreetAddressComponent } from 'app/models/api/street-address-component';

export class StreetAddressComponentParser extends BaseParser {
    parse(data: ServerResponseData, _included: ServerResponseData[], _parsersMap: ParserMap) {
        return super.parseBase(StreetAddressComponent, data);
    }
}
