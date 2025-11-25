import { BaseParser } from 'app/parsers/base-parser';
import { ServerResponseData } from 'app/models/api/response';
import { ParserMap } from 'app/parsers/response-parser';
import { Country } from 'app/models/api/country';

export class CountryParser extends BaseParser {
    parse(data: ServerResponseData, _included: ServerResponseData[], _parsersMap: ParserMap) {
        return super.parseBase(Country, data);
    }
}
