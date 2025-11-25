import { User } from '../../models/user/user.model';
import { Message } from '../../models/message.model';
import { EmailService, TemplateParams } from './email.service';
import { CommonEmailsService, EmailUtmTags } from './common-emails.service';
import { config } from '../../../config/config';
import { MessageType } from '../../models/message.types';
import { TranslationsService } from '../translations.service';
import { LocaleId } from '../../models/locale.model';
import { SitlyToken } from '../../sitly-token';
import { genderMap } from '../../types';
import { TrackingService } from '../tracking.service';
import { LinksService } from '../links.service';

interface ChatNotificationTemplateParams extends TemplateParams {
    avatarUrl: string;
    blueAccent: boolean;
    distanceLine: string;
    isInitial: boolean;
    mainHeading: string;
    messageContent: string;
    oneClickRejection: string;
    oneClickRejectionUrl: string;
    replyForFree: string;
    replyUrl: string;
    seeOtherUsers: string;
    senderFirstName: string;
    viewProfile: string;
    viewProfileUrl: string;
    yellowAccent: boolean;
}

export class ChatNotificationEmailService {
    static async sendChatEmailNotification(sender: User, receiver: User, message: Message, isFollowup: boolean) {
        TrackingService.trackEmailSent(receiver, 'chat-message-notification-v2');
        const templateParams = await this.getTemplateParams(sender, receiver, message, isFollowup);
        return EmailService.sendTemplate(
            receiver,
            'chat-message-notification-v2',
            templateParams,
            EmailService.replyToAddress(sender, receiver),
        );
    }

    private static async getTemplateParams(sender: User, receiver: User, message: Message, isFollowup: boolean) {
        const brandConfigSettings = config.getConfig(receiver.brandCode);
        const localeId = receiver.customUser.locale_id ?? LocaleId.en_GB;
        const utmTags = EmailUtmTags.tags('chat-message-notification-v2', receiver);
        const tempToken = SitlyToken.tempToken(receiver);

        const [translator, websiteUrl] = await Promise.all([
            TranslationsService.translator({ localeId, groupName: 'emails', prefix: ['chatNotifications.', 'general.'] }),
            CommonEmailsService.websiteUrl(receiver),
        ]);

        const isAutoRejection = message.message_type === MessageType.autoRejection;

        const messageContent = isAutoRejection
            ? translator.translated(`chatNotifications.autorejection.babysitter.${genderMap[sender.customUser.gender ?? 'f']}`, {
                  firstName: sender.first_name ?? '',
              })
            : message.content.length < 75
              ? message.content
              : message.content.substring(0, 75) + '...';

        return {
            mailSubject: translator.translated(isAutoRejection ? 'chatNotifications.autoRejection.subject' : 'chatNotifications.subject', {
                firstName: sender.first_name ?? '',
            }),
            websiteUrl: EmailService.buildTrackingLink({
                baseUrl: websiteUrl,
                param: { element_type: 'chat-message-notification-v2', element_description: 'logo' },
                receiver,
                utmTags,
            }),
            messageContent,
            mainHeading: translator.translated('chatNotifications.sentYouMessage', { firstName: sender.first_name ?? '' }),
            avatarUrl: sender.getAvatarUrl(500, true) ?? '',
            senderFirstName: sender.first_name ?? '',
            distanceLine: translator.translated('chatNotifications.distanceFromYou', {
                distance: `${receiver.getDistance(sender.customUser.map_latitude, sender.customUser.map_longitude)}`,
            }),
            replyForFree: translator.translated('chatNotifications.replyForFree'),
            viewProfile: translator.translated('chatNotifications.viewProfile'),
            oneClickRejection: translator.translated('chatNotifications.1ClickRejection'),
            isAutoRejection: message.message_type === MessageType.autoRejection,
            seeOtherUsers: translator.translated(
                receiver.isParent ? 'chatNotifications.viewOtherBabysitters' : 'chatNotifications.viewOtherFamilies',
            ),
            searchPageUrl: EmailService.buildTrackingLink({
                baseUrl: LinksService.searchUrl(),
                param: { element_type: 'chat-message-notification-v2', element_description: 'view_other_families' },
                receiver,
                utmTags,
                tempToken,
            }),
            replyUrl: EmailService.buildTrackingLink({
                baseUrl: LinksService.chatUrl(sender.customUser.webuser_url),
                param: { element_type: 'chat-message-notification-v2', element_description: 'reply_for_free' },
                receiver,
                utmTags,
                tempToken,
            }),
            viewProfileUrl: EmailService.buildTrackingLink({
                baseUrl: LinksService.profileUrl(sender.customUser.webuser_url),
                param: { element_type: 'chat-message-notification-v2', element_description: 'view_profile' },
                receiver,
                utmTags,
                tempToken,
            }),
            oneClickRejectionUrl: EmailService.buildTrackingLink({
                baseUrl: `${LinksService.chatUrl(sender.customUser.webuser_url)}?autoRejectUserQR=1`,
                param: { element_type: 'chat-message-notification-v2', element_description: 'rejection' },
                receiver,
                utmTags,
                tempToken,
            }),
            isInitial: !isFollowup,
            blueAccent: receiver.isParent,
            yellowAccent: !receiver.isParent,
            bottomSection: CommonEmailsService.generalBottomSection(
                receiver,
                translator,
                brandConfigSettings,
                'chat-message-notification-v2',
            ),
        } as ChatNotificationTemplateParams;
    }
}
