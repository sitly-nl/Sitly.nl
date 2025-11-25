import * as aws from 'aws-sdk';
import * as crypto from 'crypto';
import { createTransport } from 'nodemailer';
import { config } from '../../../config/config';
import { BrandCode } from '../../models/brand-code';
import { User } from '../../models/user/user.model';
import { Environment } from '../env-settings.service';
import { LinksService } from '../links.service';
import { GA4EventParams } from '../tracking.service';
import { Attachment } from 'nodemailer/lib/mailer';

aws.config.loadFromPath('aws-config.json');

export type SESTemplateName =
    | 'change-avatar'
    | 'chat-message-notification-v2'
    | 'complete-registration-reminder'
    | 'connection-invites'
    | 'forgot-password'
    | 'instant-job-notification'
    | 'login-link'
    | 'matchmail'
    | 'non-response-victim'
    | 'payment-cancellation'
    | 'personal-data-warning'
    | 'reactivation'
    | 'recommendation'
    | 'underaged';

export type EmailType = SESTemplateName | 'payment-invoice';

export interface TemplateParams {
    mailSubject: string;
    websiteUrl: string;
    textBody?: string; // old generic.html template
    bottom?: {
        // old generic.html template
        link: {
            url: string;
            title: string;
        };
    };
    // new envelop.html template
    bottomSection?: {
        socialPages: {
            facebook: string;
            instagram: string;
        };
        copyright: string;
        getApp: string;
        appLinks: {
            ios: string;
            android: string;
        };
        bottomLink: string;
    };
    [selector: string]: unknown;
}

export class EmailService {
    static allowedToSend(input: User | string | undefined) {
        const email = typeof input === 'string' ? input : input?.email;
        const bounced = typeof input === 'string' ? 0 : input?.customUser.email_bounced;
        return email && !bounced && (Environment.isProd || email.endsWith('@sitly.com') || email.endsWith('@mailinator.com'));
    }

    static buildLink(path: string, utmTags: Record<string, string>, tempToken?: string) {
        const queryParams = {
            ...utmTags,
        };
        if (tempToken) {
            queryParams.tempToken = tempToken;
        }
        return `${path}${path.includes('?') ? '&' : '?'}${Object.entries(queryParams)
            .map(([key, value]) => `${key}=${value}`)
            .join('&')}`;
    }

    static buildTrackingLink({
        baseUrl,
        receiver,
        utmTags,
        param,
        tempToken,
    }: {
        baseUrl: string;
        receiver: User;
        utmTags: Record<string, string>;
        param: Pick<GA4EventParams, 'element_type' | 'element_description'>;
        tempToken?: string;
    }) {
        return LinksService.redirectionLink(receiver, EmailService.buildLink(baseUrl, utmTags, tempToken), {
            ...param,
            element_category: 'email',
        });
    }

    static sendTemplate(
        receiver: User | { email: string; brandCode: BrandCode },
        templateName: SESTemplateName,
        params: TemplateParams,
        replyTo = '',
    ) {
        const to = receiver.email;
        if (!EmailService.allowedToSend(to ?? undefined) || !to) {
            return;
        }

        return new aws.SES({ apiVersion: '2010-12-01' })
            .sendTemplatedEmail({
                ...(replyTo ? { ReplyToAddresses: [replyTo] } : {}),
                Destination: { ToAddresses: [to] },
                Source: EmailService.from(receiver.brandCode),
                Template: EmailService.templateName(templateName),
                TemplateData: JSON.stringify(params),
            })
            .promise();
    }

    static sendTemplateBulk(templateName: SESTemplateName, bulk: { receiver: User; params: TemplateParams }[]) {
        if (bulk.length === 0) {
            return;
        }
        return new aws.SES({ apiVersion: '2010-12-01' })
            .sendBulkTemplatedEmail({
                Destinations: bulk.map(item => {
                    return {
                        Destination: { ToAddresses: [item.receiver.email ?? ''] },
                        ReplacementTemplateData: JSON.stringify(item.params),
                    };
                }),
                Source: EmailService.from(bulk[0].receiver.brandCode),
                Template: EmailService.templateName(templateName),
                DefaultTemplateData: '{}',
            })
            .promise();
    }

    static async sendTemplateBulkToUsers<T extends User>(
        templateName: SESTemplateName,
        users: T[],
        builder: (user: T) => Promise<TemplateParams>,
    ) {
        const usersToSend = users.filter(user => EmailService.allowedToSend(user));
        const chunkSize = 50;
        const resultArray = [];
        for (let i = 0; i < usersToSend.length; i += chunkSize) {
            const chunk = usersToSend.slice(i, i + chunkSize);
            const bulk = await Promise.all(
                chunk.map(async user => {
                    return {
                        receiver: user,
                        params: await builder(user),
                    };
                }),
            );
            resultArray.push(await EmailService.sendTemplateBulk(templateName, bulk));
        }

        return resultArray;
    }

    // uses nodemailer
    static async sendRawEmail(receiver: User, message: { subject: string; html?: string; attachments?: Attachment[] }) {
        if (!EmailService.allowedToSend(receiver)) {
            return;
        }

        return createTransport({
            SES: new aws.SES({ apiVersion: '2010-12-01' }),
        }).sendMail({
            to: receiver.email ?? '',
            from: EmailService.from(receiver.brandCode),
            ...message,
        });
    }

    // --- Service methods --- //
    static testRenderTemplate(templateName: SESTemplateName, params: Record<string, unknown> & { mailSubject: string }) {
        return new aws.SES({ apiVersion: '2010-12-01' })
            .testRenderTemplate({
                TemplateName: templateName,
                TemplateData: JSON.stringify(params),
            })
            .promise();
    }

    static createTemplate(htmlBody: string, name: SESTemplateName) {
        return new aws.SES({ apiVersion: '2010-12-01' })
            .createTemplate({
                Template: {
                    TemplateName: EmailService.templateName(name),
                    SubjectPart: '{{mailSubject}}',
                    HtmlPart: htmlBody,
                },
            })
            .promise();
    }

    static updateTemplate(htmlBody: string, name: SESTemplateName) {
        console.log('...updating ', EmailService.templateName(name));
        return new aws.SES({ apiVersion: '2010-12-01' })
            .updateTemplate({
                Template: {
                    TemplateName: EmailService.templateName(name),
                    SubjectPart: '{{mailSubject}}',
                    HtmlPart: htmlBody,
                },
            })
            .promise();
    }

    static replyToAddress(sender: User, receiver: User) {
        try {
            const encryptPassword = crypto.createHash('md5').update(Environment.apiKeys.replyto_email_key).digest('hex');
            const key = Buffer.from(encryptPassword.slice(0, 16), 'utf-8');
            const cipher = crypto.createCipheriv('aes-128-ecb', key, null);
            const data = `${BrandCode.netherlands}-${sender.customUser.webuser_url}-${receiver.customUser.webuser_url}-${Date.now()}`;
            let hash = cipher.update(data, 'utf8', 'base64');
            hash += cipher.final('base64');
            const emailSafe = hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '#');
            return `${emailSafe}@reply.sitly.com`;
        } catch (e) {
            console.error('Error generating replyToAddress', e);
            return '';
        }
    }

    private static from(brandCode: BrandCode) {
        const brandConfigSettings = config.getConfig(brandCode);
        return `${brandConfigSettings.brandName} <${brandConfigSettings.contactEmail}>`;
    }

    private static templateName(name: SESTemplateName) {
        const prefix = Environment.isProd ? 'prod-' : 'test-';
        return `${prefix}${name}`;
    }
}
