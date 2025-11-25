import { BaseApiModel, ServerResponse, ServerResponseData } from 'app/models/api/response';
import { AuthTokenParser } from 'app/parsers/auth-token.parser';
import { ChildParser } from 'app/parsers/child.parser';
import { ConversationParser } from 'app/parsers/conversation.parser';
import { MessageParser } from 'app/parsers/message.parser';
import { PaymentParser } from 'app/parsers/payment.parser';
import { PhotoParser } from 'app/parsers/photo.parser';
import { PlaceAddressComponentParser } from 'app/parsers/place-address-component.parser';
import { ProvinceAddressComponentParser } from 'app/parsers/province-address-component.parser';
import { RecommendationParser } from 'app/parsers/recommendations.parser';
import { ReferenceParser } from 'app/parsers/reference.parser';
import { StreetAddressComponentParser } from 'app/parsers/street-address-component.parser';
import { SubscriptionParser } from 'app/parsers/subscription.parser';
import { UserGroupParser } from 'app/parsers/user-group.parser';
import { UserParser } from 'app/parsers/user.parser';
import { BaseParser } from 'app/parsers/base-parser';
import { UserUpdatesParser } from 'app/parsers/user-updates.parser';
import { PromptParser } from 'app/parsers/prompt.parser';
import { InstagramTokenParser } from 'app/parsers/instagram-token.parser';
import { CountryParser } from 'app/parsers/country.parser';
import { ConnectionInviteParser } from 'app/parsers/connection-invite.parser';
import { NotificationPreferencesParser } from 'app/parsers/notification-preferences.parser';

export type ParserMap = Record<string, BaseParser>;

export class ResponseParser {
    private static readonly dataParserMap: ParserMap = {
        'users': new UserParser(),
        'userGroups': new UserGroupParser(),
        'tokens': new AuthTokenParser(),
        'children': new ChildParser(),
        'references': new ReferenceParser(),
        'recommendations': new RecommendationParser(),
        'photos': new PhotoParser(),
        'messages': new MessageParser(),
        'conversations': new ConversationParser(),
        'payments': new PaymentParser(),
        'street-address-components': new StreetAddressComponentParser(),
        'place-address-components': new PlaceAddressComponentParser(),
        'province-address-components': new ProvinceAddressComponentParser(),
        'instagram-tokens': new InstagramTokenParser(),
        'subscription': new SubscriptionParser(),
        'updates': new UserUpdatesParser(),
        'prompts': new PromptParser(),
        'countries': new CountryParser(),
        'connection-invite': new ConnectionInviteParser(),
        'notification-preferences': new NotificationPreferencesParser(),
    };

    static parseObject<T extends BaseApiModel | BaseApiModel[], M = unknown>(response: ServerResponse) {
        let data: T;
        if (response.data instanceof Array) {
            data = response.data.map(item => this.parseDataObject(item, response.included)) as T;
        } else {
            data = response.data ? (this.parseDataObject(response.data, response.included) as T) : ({} as T);
        }

        return {
            links: response.links as Record<string, string>,
            meta: response.meta as M,
            data,
        };
    }

    private static parseDataObject<T extends BaseApiModel>(data: ServerResponseData, included: ServerResponseData[]) {
        return this.dataParserMap[data.type]?.parse(data, included, this.dataParserMap) as T;
    }
}
