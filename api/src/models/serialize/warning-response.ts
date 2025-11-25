import { UserWarning } from '../user-warning.model';
import { User } from '../user/user.model';
import { MessageResponse } from './message-response';
import { PhotoResponse } from './photo-response';

export class WarningResponse {
    static keys: (keyof WarningResponse)[] = ['id', 'warningLevel', 'warningType', 'warningPhrases', 'warningText', 'message', 'photo'];

    id = this.warning.instance_id;
    warningLevel = this.warning.warning_level;
    warningType = this.warning.warning_type;
    warningPhrases = this.warning.warning_phrases;
    warningText = this.warning.warning_text;
    message: MessageResponse;
    photo: PhotoResponse;

    private constructor(private warning: UserWarning) {}

    static async instance(warning: UserWarning, user: User) {
        const ret = new WarningResponse(warning);

        if (warning.message) {
            ret.message = await MessageResponse.instance(warning.message, user);
        }

        if (warning.photo) {
            ret.photo = PhotoResponse.instance(warning.photo, user);
        }

        return ret;
    }
}
