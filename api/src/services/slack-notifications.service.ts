import { request } from '../utils/util';
import { Environment } from './env-settings.service';

export enum SlackChannels {
    paymentMonitoring = 'C01ADSUT2LC',
    apiMonitoring = 'C0422FT57GD',
    cronMonitoring = 'C043UQ9LB5W',
}

export class SlackNotifications {
    static async send(message: string, channel: SlackChannels, addDivider = false) {
        const blocks: unknown[] = [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: message,
                },
            },
        ];
        if (addDivider) {
            blocks.push({ type: 'divider' });
        }

        const res = await request({
            method: 'POST',
            url: 'https://slack.com/api/chat.postMessage',
            headers: { Authorization: `Bearer ${Environment.apiKeys.slack_bot_token}` },
            json: { channel, blocks },
        });
        return res?.body as unknown;
    }
}
