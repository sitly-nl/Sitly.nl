import { GemUser } from '../gem/gem-user.model';
import { GemCountryResponse } from './country-response';
import { Serializer as JSONAPISerializer, SerializerOptions } from 'jsonapi-serializer';
import { LocaleResponse } from './locale-response';

export class GemUserResponse {
    static keys: (keyof GemUserResponse)[] = ['id', 'email', 'firstName', 'lastName', 'role', 'countries', 'locales'];

    id = this.user.user_id;
    email = this.user.email;
    firstName = this.user.first_name;
    lastName = this.user.last_name;
    role = this.user.role;
    countries = this.user.countries.map(item => GemCountryResponse.instance(item));
    locales = this.user.locales?.map(item => LocaleResponse.instance(item));

    private constructor(private user: GemUser) {}

    static instance(user: GemUser) {
        return new GemUserResponse(user);
    }
}

export const serializeGemUser = (data: GemUser | GemUser[], dataMeta?: { password: string; tfaSecret: string }) => {
    const serializer = new JSONAPISerializer('gem-user', new GemUserSerializationOptions(dataMeta));
    return serializer.serialize(Array.isArray(data) ? data.map(item => GemUserResponse.instance(item)) : GemUserResponse.instance(data));
};

class GemUserSerializationOptions implements SerializerOptions {
    attributes = GemUserResponse.keys;
    keyForAttribute = 'camelCase';
    countries = {
        ref: 'id',
        attributes: GemCountryResponse.keys,
    };
    locales = {
        ref: 'id',
        attributes: LocaleResponse.keys,
    };

    constructor(public dataMeta?: { password: string; tfaSecret: string }) {}
}
