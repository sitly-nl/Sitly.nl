import { BaseParser } from 'app/parsers/base-parser';
import { UserUpdates } from 'app/models/api/user-updates';
import { ServerResponseData } from 'app/models/api/response';
import { ParserMap } from 'app/parsers/response-parser';

export class UserUpdatesParser extends BaseParser {
    parse(data: ServerResponseData, included: ServerResponseData[], parsersMap: ParserMap) {
        const item = super.parseBase(UserUpdates, data);
        item.prompt = this.getRelationship('prompt', data, included, parsersMap);
        return item;
    }
}
