import { ServerResponseData } from 'app/models/api/response';
import { BaseParser } from 'app/parsers/base-parser';
import { ParserMap } from 'app/parsers/response-parser';
import { NotificationPreferences } from 'app/models/api/notification-preferences';

export class NotificationPreferencesParser extends BaseParser {
    parse(data: ServerResponseData, _included: ServerResponseData[], _parsersMap: ParserMap) {
        return super.parseBase(NotificationPreferences, data);
    }
}
