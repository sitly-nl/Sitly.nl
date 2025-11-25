import { ServerResponseData } from 'app/models/api/response';
import { BaseParser } from 'app/parsers/base-parser';
import { ParserMap } from 'app/parsers/response-parser';
import { ConnectionInvite } from 'app/models/api/connection-invite';
import { User } from 'app/models/api/user';

export class ConnectionInviteParser extends BaseParser {
    parse(data: ServerResponseData, included: ServerResponseData[], parsersMap: ParserMap) {
        const invite = super.parseBase(ConnectionInvite, data);
        invite.contactUser = this.getRelationship('contactUser', data, included, parsersMap) ?? new User();
        return invite;
    }
}
