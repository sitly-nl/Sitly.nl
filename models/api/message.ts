import { BaseApiModel } from 'app/models/api/response';

export enum MessageType {
    regular = 'regular',
    askRecommendation = 'askRecommendation',
    jobPostingReply = 'jobPostingReply',
    jobPostingRejection = 'jobPostingRejection',
    safetyTips = 'safetyTips',
    instantJob = 'instantJob',
    autoRejection = 'autoRejection',
}

export enum MessageAction {
    sent = 'sent',
    received = 'received',
}

export class Message extends BaseApiModel {
    type: MessageType;
    content?: string;
    title?: string;
    readByReceiver?: boolean;
    created: string;

    declare meta: {
        action: MessageAction;
    };

    link?: string;
    text?: string;
    date: Date;
    get isSafetyTips() {
        return this.type === MessageType.safetyTips;
    }
    get isAutorejection() {
        return this.type === MessageType.autoRejection;
    }

    get action() {
        return this.meta.action;
    }

    fill() {
        if (this.content) {
            const parts = this.content.split('\n');
            const lastPart = parts[parts.length - 1];
            if (lastPart.startsWith('http://') || lastPart.startsWith('https://')) {
                this.link = lastPart;
                this.text = parts.splice(0, parts.length - 1).join('\n');
            } else {
                this.link = undefined;
                this.text = this.content;
            }
            this.text = this.text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
        }
        if (this.created) {
            this.date = new Date(this.created);
        }
        this.type = this.type ?? MessageType.regular;
    }
}
