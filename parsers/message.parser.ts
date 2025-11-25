import { Message } from 'app/models/api/message';
import { BaseParser } from 'app/parsers/base-parser';
import { ServerResponseData } from 'app/models/api/response';

export class MessageParser extends BaseParser {
    parse(data: ServerResponseData) {
        const item = super.parseBase(Message, data);
        item.fill();
        return item;
    }
}
