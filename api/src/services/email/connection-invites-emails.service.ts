import { config } from '../../../config/config';
import { BrandCode } from '../../models/brand-code';
import { ConnectionInvite } from '../../models/connection-invite.model';
import { LocaleId } from '../../models/locale.model';
import { User } from '../../models/user/user.model';
import { getModels } from '../../sequelize-connections';
import { SitlyToken } from '../../sitly-token';
import { Util } from '../../utils/util';
import { LinksService } from '../links.service';
import { TrackingService } from '../tracking.service';
import { TranslationsService } from '../translations.service';
import { CommonEmailsService, EmailUtmTags } from './common-emails.service';
import { EmailService } from './email.service';

export type BaseEmailSendData = { webuser_id: number; invites_ids: string; count: number };

export class ConnectionInvitesEmailService {
    static async send(brandCode: BrandCode, sendData: BaseEmailSendData[]) {
        if (sendData.length === 0) {
            return;
        }

        const now = new Date();
        const models = getModels(brandCode);
        await models.NotificationSettings.update(
            { last_connection_invite_email_sent: now },
            {
                where: { webuser_id: sendData.map(item => item.webuser_id) },
            },
        );

        const chunkSize = 3_000;
        for (let i = 0; i < sendData.length; i += chunkSize) {
            const chunk = sendData.slice(i, i + chunkSize);
            const users = await models.User.findAll({
                where: { webuser_id: chunk.map(item => item.webuser_id) },
                include: 'customUser',
            });

            Promise.all(users.map(item => TrackingService.trackEmailSent(item, 'connection-invites')));

            const connectionInvites = await models.ConnectionInvite.findAll({
                where: {
                    connection_invite_id: chunk.flatMap(item => item.invites_ids.split(',')),
                },
                include: [{ association: 'sender', include: ['customUser'] }],
            });

            await EmailService.sendTemplateBulkToUsers('connection-invites', users, async user => {
                const item = chunk.find(item => item.webuser_id === user.webuser_id);
                const inviteIds = item?.invites_ids.split(',').map(item => +item) ?? [];
                const invites = connectionInvites.filter(item => inviteIds.includes(item.connection_invite_id));
                return ConnectionInvitesEmailService.templateParams(user, invites, item?.count ?? 0);
            });
        }
    }

    private static async templateParams(receiver: User, invites: ConnectionInvite[], totalInvitesCount: number) {
        const emailType = 'connection-invites';
        const brandConfigSettings = config.getConfig(receiver.brandCode);
        const utmTags = EmailUtmTags.tags(emailType, receiver);
        const localeId = receiver.customUser.locale_id ?? LocaleId.en_GB;
        const tempToken = SitlyToken.tempToken(receiver);

        const [translator, websiteUrl] = await Promise.all([
            TranslationsService.translator({ localeId, groupName: 'emails', prefix: ['connectionInvites.', 'general.'] }),
            CommonEmailsService.websiteUrl(receiver),
        ]);

        const shuffledIndexes = Util.shuffledArrayOfNumbers(20);
        const invitesSenders = invites.map((invite, index) => {
            const sender = invite.sender;
            return sender
                ? {
                      avatar: `https://cdn.sitly.com/images/emails/blurred-avatars/avatar-${shuffledIndexes[index]}.jpg`,
                      line0: translator.translated('connectionInvites.yearsOld', { years: `${sender.age}` }),
                      line1: translator.translated('connectionInvites.distance', {
                          distance: `${receiver.getDistance(sender.customUser.map_latitude, sender.customUser.map_longitude)}`,
                      }),
                  }
                : {};
        });
        const translationSuffix = `parent.${totalInvitesCount <= 1 ? 'singular' : 'plural'}`;
        return {
            mailSubject: translator.translated(`connectionInvites.subject.${translationSuffix}`, {
                totalInvitesCount: `${totalInvitesCount}`,
            }),
            websiteUrl: EmailService.buildTrackingLink({
                baseUrl: websiteUrl,
                param: { element_type: emailType, element_description: 'logo' },
                receiver,
                utmTags,
            }),
            title: translator.translated(`connectionInvites.title.${translationSuffix}`, {
                totalInvitesCount: `${totalInvitesCount}`,
            }),
            subTitle: translator.translated(`connectionInvites.subtitle.${translationSuffix}`, {
                totalInvitesCount: `${totalInvitesCount}`,
            }),
            invitesSenders,
            viewAllLabel: translator.translated('connectionInvites.cta.viewAll'),
            viewAllUrl: EmailService.buildTrackingLink({
                baseUrl: LinksService.invitesUrl(),
                param: { element_type: emailType, element_description: 'view_invites' },
                receiver,
                utmTags,
                tempToken,
            }),
            bottomSection: CommonEmailsService.generalBottomSection(receiver, translator, brandConfigSettings, emailType),
        };
    }
}
