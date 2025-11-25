import { BaseParser } from 'app/parsers/base-parser';
import { ServerResponseData } from 'app/models/api/response';
import { ParserMap } from 'app/parsers/response-parser';
import { Child } from 'app/models/api/child';

export class ChildParser extends BaseParser {
    parse(data: ServerResponseData, _included: ServerResponseData[], _parsersMap: ParserMap) {
        const item = super.parseBase(Child, data);
        item.traits ??= [];
        return item;
    }
}
