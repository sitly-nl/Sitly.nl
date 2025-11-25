import { ServerResponseData } from 'app/models/api/response';
import { BaseParser } from 'app/parsers/base-parser';
import { InstagramToken } from 'app/models/api/instagram-token';

export class InstagramTokenParser extends BaseParser {
    parse(data: ServerResponseData) {
        const item = super.parseBase(InstagramToken, data);
        return item;
    }
}
