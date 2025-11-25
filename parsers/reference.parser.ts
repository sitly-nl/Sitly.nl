import { BaseParser } from 'app/parsers/base-parser';
import { ServerResponseData } from 'app/models/api/response';
import { ParserMap } from 'app/parsers/response-parser';
import { Reference } from 'app/models/api/reference';

export class ReferenceParser extends BaseParser {
    parse(data: ServerResponseData, _included: ServerResponseData[], _parsersMap: ParserMap) {
        return super.parseBase(Reference, data);
    }
}
