import { BaseApiModel } from 'app/models/api/response';

export class UserGroup extends BaseApiModel {
    endAt: string;
    count: number;
    latitude: number;
    longitude: number;
}
