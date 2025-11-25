import { TranslationsService } from '../../services/translations.service';
import { Message } from '../message.model';
import { MessageType } from '../message.types';
import { User } from '../user/user.model';

export class MessageResponse {
    static keys: (keyof MessageResponse)[] = ['id', 'content', 'title', 'readByReceiver', 'created', 'type'];
    static gemKeys: (keyof MessageResponse)[] = [...MessageResponse.keys, 'receiverId'];

    id = this.message.instance_id;
    content = this.message.content;
    readByReceiver = !!this.message.message_read;
    created = this.message.created?.toISOString();
    type = this.message.message_type;
    title?: string;
    action?: 'sent' | 'received';
    receiverId = this.message.receiver_id;

    private constructor(private message: Message) {}

    static async instance(message: Message, user: User) {
        const ret = new MessageResponse(message);

        ret.action = message.sender_id === user.webuser_id ? 'sent' : 'received';
        await ret.fillMessagesWithComputedData(message, user);

        return ret;
    }

    private async fillMessagesWithComputedData(message: Message, user: User) {
        const localeId = user.customUser.locale_id;
        if (message.message_type === MessageType.autoRejection && localeId) {
            const translator = await TranslationsService.translator({
                localeId,
                groupName: 'messages',
                prefix: 'autorejection.',
            });
            this.content = translator.translated(message.content ?? '', { '[firstName]': message.sender_name ?? '' }, false);
        }
    }
}
