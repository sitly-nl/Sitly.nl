import { BaseParser } from 'app/parsers/base-parser';
import { Conversation } from 'app/models/api/conversation';
import { ServerResponseData } from 'app/models/api/response';
import { ParserMap } from 'app/parsers/response-parser';

export class ConversationParser extends BaseParser {
    parse(data: ServerResponseData, included: ServerResponseData[], parsersMap: ParserMap) {
        const item = super.parseBase(Conversation, data);
        item.chatPartner = this.getRelationship('chatPartner', data, included, parsersMap);
        item.lastMessage = this.getRelationship('lastMessage', data, included, parsersMap);
        return item;
    }
}
