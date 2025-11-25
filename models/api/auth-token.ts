import { User } from 'app/models/api/user';
import { BaseApiModel } from 'app/models/api/response';
import { CountryCode } from 'app/models/api/country';

export class AuthToken extends BaseApiModel {
    token: string;
    user: User;
    countryCode: CountryCode;
}
