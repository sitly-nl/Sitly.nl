import { AuthToken } from 'app/models/api/auth-token';
import { ServerResponseData } from 'app/models/api/response';
import { ParserMap } from 'app/parsers/response-parser';
import { BaseParser } from 'app/parsers/base-parser';

export class AuthTokenParser extends BaseParser {
    parse(data: ServerResponseData, included: ServerResponseData[], parsersMap: ParserMap) {
        const item = super.parseBase(AuthToken, data);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        item.user = this.getRelationship('user', data, included, parsersMap)!;
        return item;
    }
}
