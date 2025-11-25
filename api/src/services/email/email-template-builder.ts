import { readFileSync, writeFileSync } from 'fs';
import { EmailService, SESTemplateName } from './email.service';
import { Util } from '../../utils/util';

const template = (replaceBodyFilePath?: string) => {
    let mainHtml = readFileSync('./src/views/emails/envelop.html', 'utf8');
    if (replaceBodyFilePath) {
        const body = readFileSync(replaceBodyFilePath, 'utf8');
        mainHtml = mainHtml.replace('{{#if false}}__CUSTOM_BODY_PLACEHOLDER__{{/if}}', body);
    }
    return mainHtml.replace(/\t/g, '');
};

/* eslint-disable @typescript-eslint/naming-convention */
const templates: Record<SESTemplateName, () => string> = {
    'underaged': () => {
        return readFileSync('./src/views/emails/generic.html', 'utf8');
    },
    'forgot-password': () => {
        return readFileSync('./src/views/emails/generic.html', 'utf8');
    },
    'login-link': () => {
        return readFileSync('./src/views/emails/generic.html', 'utf8');
    },
    'payment-cancellation': () => {
        return readFileSync('./src/views/emails/generic.html', 'utf8');
    },
    'personal-data-warning': () => {
        return readFileSync('./src/views/emails/generic.html', 'utf8');
    },
    'change-avatar': () => {
        return readFileSync('./src/views/emails/generic.html', 'utf8');
    },
    'complete-registration-reminder': () => {
        return readFileSync('./src/views/emails/generic.html', 'utf8');
    },
    'connection-invites': () => {
        return template('./src/views/emails/sub-templates/connection-invites-body.html');
    },
    'matchmail': () => {
        return template('./src/views/emails/sub-templates/matchmail-body.html');
    },
    'reactivation': () => {
        let mainHtml = readFileSync('./src/views/emails/generic.html', 'utf8');
        const body = readFileSync('./src/views/emails/sub-templates/reactivation-body.html', 'utf8');
        mainHtml = mainHtml.replace('{{#if false}}__CUSTOM_BODY_PLACEHOLDER__{{/if}}', body);
        return mainHtml;
    },
    'recommendation': () => {
        let mainHtml = readFileSync('./src/views/emails/generic.html', 'utf8');
        const body = readFileSync('./src/views/emails/sub-templates/recommendation-body.html', 'utf8');
        mainHtml = mainHtml.replace('{{#if false}}__CUSTOM_BODY_PLACEHOLDER__{{/if}}', body);
        return mainHtml;
    },
    'non-response-victim': () => {
        let mainHtml = readFileSync('./src/views/emails/generic.html', 'utf8');
        const body = readFileSync('./src/views/emails/sub-templates/non-response-victim-body.html', 'utf8');
        mainHtml = mainHtml.replace('{{#if false}}__CUSTOM_BODY_PLACEHOLDER__{{/if}}', body);
        return mainHtml;
    },
    'chat-message-notification-v2': () => {
        return template('./src/views/emails/sub-templates/chat-message-notification-body.html');
    },
    'instant-job-notification': () => {
        let mainHtml = readFileSync('./src/views/emails/generic.html', 'utf8');
        const body = readFileSync('./src/views/emails/sub-templates/instant-job-notification.html', 'utf8');
        mainHtml = mainHtml.replace('{{#if false}}__CUSTOM_BODY_PLACEHOLDER__{{/if}}', body);
        return mainHtml;
    },
};
/* eslint-enable @typescript-eslint/naming-convention */

export class EmailTemplateBuilder {
    static async update(name: keyof typeof templates) {
        const content = templates[name]();

        EmailTemplateBuilder.saveToFileSystem(name, content);

        try {
            return await EmailService.updateTemplate(content, name);
        } catch (error) {
            if (`${error as never}`.startsWith('TemplateDoesNotExist:')) {
                return EmailService.createTemplate(content, name);
            }
        }
    }

    static renderAll() {
        Object.entries(templates).map(([key, value]) => {
            EmailTemplateBuilder.saveToFileSystem(key as SESTemplateName, value());
        });
    }

    static async renderAndUploadAll() {
        for (const name of Util.keysOf(templates)) {
            await EmailTemplateBuilder.update(name);
        }
    }

    private static saveToFileSystem(name: SESTemplateName, content: string) {
        writeFileSync(`src/views/emails/compiled/${name}.html`, content);
    }
}
