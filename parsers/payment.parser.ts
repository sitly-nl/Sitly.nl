import { BaseParser } from 'app/parsers/base-parser';
import { ServerResponseData } from 'app/models/api/response';
import { ParserMap } from 'app/parsers/response-parser';
import { Payment, PSPType } from 'app/models/api/payment';

export class PaymentParser extends BaseParser {
    parse(data: ServerResponseData, _included: ServerResponseData[], _parsersMap: ParserMap) {
        const item = super.parseBase(Payment, data);
        if (item?.psp) {
            item.psp = item.psp.toLowerCase() as PSPType;
        }
        return item;
    }
}
