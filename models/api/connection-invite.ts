import { BaseApiModel } from 'app/models/api/response';
import { User } from 'app/models/api/user';

export class ConnectionInvite extends BaseApiModel {
    status: 'open' | 'ignored' | 'accepted';
    contactUser: User;
    viewed: boolean;
}
