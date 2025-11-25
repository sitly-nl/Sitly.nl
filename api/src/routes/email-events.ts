import * as express from 'express';
import { Request, Response, Router } from 'express';
import { BrandCode } from './../models/brand-code';
import { notFoundError, unprocessableEntityError, forbiddenError } from './../services/errors';
import { Environment } from './../services/env-settings.service';
import { BaseRoute } from './route';
import { createPublicKey, verify } from 'crypto';
import { request } from '../utils/util';
import { MatchmailSetting } from '../models/user/custom-user.model';
import { getModels } from '../sequelize-connections';
import { SentryService } from '../services/sentry.service';

export enum SnsType {
    subscriptionConfirmation = 'SubscriptionConfirmation',
    notification = 'Notification',
}

export interface SnsMessage {
    Type: SnsType;
    MessageId: string;
    TopicArn: string;
    Message: string;
    Timestamp: string;
    SignatureVersion: string;
    Signature: string;
    SigningCertURL: string;
}

export interface SnsConfirmationMessage extends SnsMessage {
    Type: SnsType.subscriptionConfirmation;
    Token: string;
    SubscribeURL: string;
}

export interface SnsNotificationMessage extends SnsMessage {
    Type: SnsType.notification;
    Subject?: string;
    UnsubscribeURL: string;
}

export enum SnsNotificationType {
    bounce = 'Bounce',
    complaint = 'Complaint',
}

export enum SnsBounceType {
    permanent = 'Permanent',
    transient = 'Transient',
}

export enum SnsBounceSubType {
    mailboxFull = 'MailboxFull',
    general = 'General',
}
export interface SnsBounce {
    bounceType: SnsBounceType;
    bounceSubType: SnsBounceSubType;
    bouncedRecipients: [
        {
            emailAddress: string;
        },
    ];
}

export enum SnsComplaintFeedbackType {
    abuse = 'abuse',
    virus = 'virus',
    fraud = 'fraud',
}
export interface SnsComplaint {
    complainedRecipients: [
        {
            emailAddress: string;
        },
    ];
    complaintFeedbackType: SnsComplaintFeedbackType;
}

export interface ParsedSnsMessage {
    notificationType: SnsNotificationType;
    bounce?: SnsBounce;
    complaint?: SnsComplaint;
    mail: {
        source: string;
        sourceArn: string;
        destination: string[];
    };
}

export enum AwsTopicArn {
    bounce = 'arn:aws:sns:eu-west-1:392729904730:ses-bounces-topic',
    complaint = 'arn:aws:sns:eu-west-1:392729904730:ses-complaints-topic',
}

export function sanitizeSns(req: Request) {
    req.checkHeaders('x-amz-sns-message-type')
        .notEmpty()
        .withMessage({
            code: 'REQUIRED',
            title: 'message-type header is required',
        })
        .isIn(Object.values(SnsType))
        .withMessage({
            code: 'INVALID_VALUE',
            title: 'proper message-type header value is required',
        });

    req.checkHeaders('x-amz-sns-topic-arn')
        .notEmpty()
        .withMessage({
            code: 'REQUIRED',
            title: 'topic-arn header is required',
        })
        .isIn(Object.values(AwsTopicArn))
        .withMessage({
            code: 'INVALID_VALUE',
            title: 'proper topic-arn header value is required',
        });

    req.checkBody('Type').isIn(Object.values(SnsType)).withMessage({
        code: 'INVALID_VALUE',
        title: 'proper Type value is required',
    });

    req.checkBody('MessageId').notEmpty().isString().withMessage({
        code: 'REQUIRED',
        title: 'proper MessageId is required',
    });

    req.checkBody('TopicArn')
        .notEmpty()
        .withMessage({
            code: 'REQUIRED',
            title: 'proper TopicArn in body is required',
        })
        .isIn(Object.values(AwsTopicArn))
        .withMessage({
            code: 'INVALID_VALUE',
            title: 'proper TopicArn in body value is required',
        });

    req.checkBody('Timestamp').notEmpty().isString().withMessage({
        code: 'REQUIRED',
        title: 'proper Timestamp is required',
    });

    req.checkBody('Message').notEmpty().isString().withMessage({
        code: 'REQUIRED',
        title: 'proper Message is required',
    });

    req.checkBody('Signature').notEmpty().isString().withMessage({
        code: 'REQUIRED',
        title: 'proper Signature is required',
    });

    req.checkBody('SigningCertURL').notEmpty().isString().withMessage({
        code: 'REQUIRED',
        title: 'proper SigningCertURL is required',
    });

    req.checkBody('SubscribeURL').optional().isString().withMessage({
        code: 'REQUIRED',
        title: 'proper SubscribeURL is required',
    });

    req.checkBody('Subject').optional().isString().withMessage({
        code: 'REQUIRED',
        title: 'proper Subject is required',
    });

    req.checkBody('Token').optional().isString().withMessage({
        code: 'REQUIRED',
        title: 'proper Token is required',
    });
}

export class EmailEventsRoute extends BaseRoute {
    static create(router: Router) {
        router.post('/email-events', express.text({ type: 'text/plain' }), (req, res, next) => {
            try {
                new EmailEventsRoute().emailEvent(req, res);
            } catch (error) {
                SentryService.captureException(error, 'emailEventsRoute', req.brandCode, {
                    url: req.url,
                    headers: req.headers,
                    body: req.body,
                });
                next(error);
            }
        });
    }

    async emailEvent(req: Request, res: Response) {
        if (typeof req.body !== 'string') {
            return unprocessableEntityError({ res, title: 'invalid body format' });
        }

        req.body = JSON.parse(req.body) as Record<string, unknown>;
        sanitizeSns(req);
        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }
        const snsMessage = req.body as SnsMessage;

        if (!Environment.isApiTests) {
            if (!(await this.verifySnsSignature(snsMessage))) {
                return forbiddenError({ res, title: 'invalid signature' });
            }
        }

        if (snsMessage.Type === SnsType.subscriptionConfirmation) {
            return this.handleConfirmationMassage(snsMessage as SnsConfirmationMessage, res);
        }

        const message = JSON.parse(snsMessage.Message) as ParsedSnsMessage;
        const sourceArn = message.mail.sourceArn;
        const brandCode = sourceArn.substring(sourceArn.lastIndexOf('.') + 1) as BrandCode;

        if (!Object.values(BrandCode).includes(brandCode)) {
            return this.serverError(req, res, new Error('invalid brand code'));
        }

        switch (message.notificationType) {
            case SnsNotificationType.bounce:
                return await this.handleBounceMessage(message, res, brandCode);
            case SnsNotificationType.complaint:
                return await this.handleComplaintMessage(message, res, brandCode);
            default:
                message.notificationType satisfies never;
                return notFoundError({ res, title: 'invalid notification type' });
        }
    }

    private async handleBounceMessage(message: ParsedSnsMessage, res: Response, brandCode: BrandCode) {
        if (!message.bounce) {
            return unprocessableEntityError({ res, title: 'invalid bounce format' });
        }

        const allowedBounceCombinations = [
            `${SnsBounceType.permanent}:${SnsBounceSubType.general}`,
            `${SnsBounceType.transient}:${SnsBounceSubType.mailboxFull}`,
        ];
        const currentBounceCombination = `${message.bounce.bounceType}:${message.bounce.bounceSubType}`;
        if (!allowedBounceCombinations.includes(currentBounceCombination)) {
            return res.status(200).json('no action taken for this bounce type');
        }

        const userEmail = message.bounce.bouncedRecipients[0]?.emailAddress;
        const user = await getModels(brandCode).User.byEmail(userEmail.trim());
        if (!user) {
            return notFoundError({ res, title: 'user not found' });
        }

        await user.customUser.update({ email_bounced: 1 });
        return res.status(200).json();
    }

    private async handleComplaintMessage(message: ParsedSnsMessage, res: Response, brandCode: BrandCode) {
        if (!message.complaint) {
            return unprocessableEntityError({ res, title: 'invalid complaint format' });
        }
        if (!Object.values(SnsComplaintFeedbackType).includes(message.complaint.complaintFeedbackType)) {
            return res.status(200).json('no action taken for this complaint type');
        }

        const userEmail = message.complaint.complainedRecipients[0]?.emailAddress;
        const user = await getModels(brandCode).User.byEmail(userEmail.trim());

        if (!user) {
            return notFoundError({ res, title: 'user not found' });
        }
        await user.customUser.update({
            email_complaints_count: (user.customUser.email_complaints_count ?? 0) + 1,
            automatch_mail: MatchmailSetting.never,
        });

        return res.status(200).json();
    }

    private async handleConfirmationMassage(snsMessage: SnsConfirmationMessage, res: Response) {
        const { SubscribeURL } = snsMessage;
        if (!SubscribeURL) {
            return forbiddenError({ res, title: 'invalid subscription confirmation' });
        }
        if (Environment.isApiTests) {
            return res.status(200).json({ url: SubscribeURL });
        }
        const response = await request({ url: SubscribeURL });
        return res.status(response.statusCode).json();
    }

    private async verifySnsSignature(snsMessage: SnsMessage) {
        const { SigningCertURL, Signature, Type } = snsMessage;

        const certUrl = new URL(SigningCertURL);
        if (!/^sns\.[a-zA-Z0-9-]{3,}\.amazonaws\.com(\.cn)?$/.test(certUrl.hostname)) {
            return false;
        }

        const certResponse = await request({ url: SigningCertURL });
        const x509 = Buffer.from(certResponse.body as string, 'ascii');
        const publicKey = createPublicKey(x509);
        const signature = Buffer.from(Signature, 'base64');

        const stringToSign =
            Type === SnsType.subscriptionConfirmation
                ? this.buildStringToSignConfirmation(snsMessage as SnsConfirmationMessage)
                : this.buildStringToSignNotification(snsMessage as SnsNotificationMessage);
        return verify('sha1WithRSAEncryption', Buffer.from(stringToSign, 'utf8'), publicKey, signature);
    }

    private buildStringToSignConfirmation(snsMessage: SnsConfirmationMessage) {
        const { Message, MessageId, SubscribeURL, Timestamp, Token, TopicArn, Type } = snsMessage;
        return `Message\n${Message}\nMessageId\n${MessageId}\nSubscribeURL\n${SubscribeURL}\nTimestamp\n${Timestamp}\nToken\n${Token}\nTopicArn\n${TopicArn}\nType\n${Type}\n`;
    }

    private buildStringToSignNotification(snsMessage: SnsNotificationMessage) {
        const { Message, MessageId, Subject, Timestamp, TopicArn, Type } = snsMessage;
        return `Message\n${Message}\nMessageId\n${MessageId}\n${
            Subject ? `Subject\n${Subject}\n` : ''
        }Timestamp\n${Timestamp}\nTopicArn\n${TopicArn}\nType\n${Type}\n`;
    }
}
