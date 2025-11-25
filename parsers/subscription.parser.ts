import { BaseParser } from 'app/parsers/base-parser';
import { ServerResponseData } from 'app/models/api/response';
import { ParserMap } from 'app/parsers/response-parser';
import { Subscription } from 'app/models/api/subscription';

export class SubscriptionParser extends BaseParser {
    parse(data: ServerResponseData, _included: ServerResponseData[], _parsersMap: ParserMap) {
        return super.parseBase(Subscription, data);
    }
}
