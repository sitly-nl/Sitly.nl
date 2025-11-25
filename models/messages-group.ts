import { Message, MessageAction } from 'app/models/api/message';
import { differenceInCalendarDays, differenceInSeconds } from 'date-fns';
import { formattedDate } from 'app/models/date-languages';

export enum MessageComponentType {
    regular,
    safetyTips,
}

export class MessagesGroup {
    date: Date;
    formattedDate: string;
    action: MessageAction;
    messages: Message[] = [];
    isSafetyTips = false;
    isAutorejectionMessage = false;
    get messageComponentType() {
        if (this.isSafetyTips) {
            return MessageComponentType.safetyTips;
        }
        return MessageComponentType.regular;
    }

    static messagesGroups(messages: Message[], localeCode: string) {
        const parsedConversation: MessagesGroup[] = [];
        let lastMessage: Message | undefined;
        let group: MessagesGroup | undefined;

        for (let i = messages.length - 1; i >= 0; i--) {
            const message = messages[i];
            const diff = lastMessage ? differenceInSeconds(message.date, lastMessage.date) : 0;

            const newGroup =
                !lastMessage || diff > 180 || message.action !== lastMessage.action || message.link || message.type !== lastMessage.type;
            if (newGroup) {
                group = new MessagesGroup();
                group.date = message.date;
                group.formattedDate = MessagesGroup.formatDate(message.date, localeCode);
                group.action = message.action;
                group.isSafetyTips = message.isSafetyTips;
                group.isAutorejectionMessage = message.isAutorejection;
                parsedConversation.push(group);
            }
            group?.messages.push(message);

            lastMessage = message;
        }

        return parsedConversation;
    }

    private static formatDate(date: Date, localeCode: string) {
        const now = new Date();
        const diffInDays = differenceInCalendarDays(now, date);

        if (diffInDays === 0) {
            return 'today';
        } else if (diffInDays === 1) {
            return 'yesterday';
        }
        return formattedDate(date, 'd MMMM yyyy', localeCode);
    }
}
