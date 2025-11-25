import { BaseApiModel } from 'app/models/api/response';

export class InstagramToken extends BaseApiModel {
    instagramAccessToken: string;
    instagramUserId: string;
}
