import { User } from '../../models/user/user.model';
import { EmailService } from './email.service';
import { CommonEmailsService, EmailUtmTags } from './common-emails.service';
import { SitlyToken } from '../../sitly-token';
import { TranslationsService } from '../translations.service';
import { MessagesEmailService } from './messages-emails.service';
import { addDays, format, isPast, set } from 'date-fns';
import { LinksService } from '../links.service';

export class InstantJobNotificationsEmailService {
    static async sendBulkInstantJobEmailNotification(sender: User, receivers: User[]) {
        return EmailService.sendTemplateBulkToUsers('instant-job-notification', receivers, async user =>
            this.getTemplateParams(sender, user),
        );
    }

    static async getRenderedTemplate(sender: User, receiver: User) {
        const templateParams = await this.getTemplateParams(sender, receiver);
        return EmailService.testRenderTemplate('instant-job-notification', templateParams);
    }

    private static async getTemplateParams(sender: User, receiver: User) {
        const receiverLocalId = receiver.localeId;
        const distanceFromSender = receiver.getDistance(sender.customUser.map_latitude, sender.customUser.map_longitude);
        const targetDate = isPast(set(new Date(), { hours: 11 })) ? addDays(new Date(), 1) : new Date();

        const utmTags = EmailUtmTags.tags('login-link', receiver);
        const loginToken = SitlyToken.tempToken(receiver);

        const [unsubscribe, websiteUrl, generalTranslations, instantJobTranslations] = await Promise.all([
            CommonEmailsService.unsubscribeSection(receiver),
            CommonEmailsService.websiteUrl(receiver),
            TranslationsService.translator({ localeId: receiverLocalId, groupName: 'emails', prefix: 'general.' }),
            TranslationsService.translator({ localeId: receiverLocalId, groupName: 'emails', prefix: 'instantJob.' }),
        ]);

        const preferredRolesArray = [
            ...(sender.customUser.pref_babysitter ? [generalTranslations.translated('general.babysitters').toLocaleLowerCase()] : []),
            ...(sender.customUser.pref_childminder ? [generalTranslations.translated('general.childminders').toLocaleLowerCase()] : []),
        ];

        const availableDays = [
            ...(sender.customUser.pref_monday ? [generalTranslations.translated('general.monday').toLocaleLowerCase()] : []),
            ...(sender.customUser.pref_tuesday ? [generalTranslations.translated('general.tuesday').toLocaleLowerCase()] : []),
            ...(sender.customUser.pref_wednesday ? [generalTranslations.translated('general.wednesday').toLocaleLowerCase()] : []),
            ...(sender.customUser.pref_thursday ? [generalTranslations.translated('general.thursday').toLocaleLowerCase()] : []),
            ...(sender.customUser.pref_friday ? [generalTranslations.translated('general.friday').toLocaleLowerCase()] : []),
            ...(sender.customUser.pref_saturday ? [generalTranslations.translated('general.saturday').toLocaleLowerCase()] : []),
            ...(sender.customUser.pref_sunday ? [generalTranslations.translated('general.sunday').toLocaleLowerCase()] : []),
        ];

        if (!sender.customUser.children) {
            await sender.customUser.reload({ include: ['children'] });
        }
        const childrenLine = MessagesEmailService.createTranslatedChildrenLine(sender.customUser.children ?? [], generalTranslations);

        return {
            mailSubject: instantJobTranslations.translated('instantJob.subject', { firstNameSender: sender.first_name ?? '' }),
            senderAvatarUrl: sender.getAvatarUrl() ?? '',
            hasAvailability: availableDays.length > 0,
            helloText: generalTranslations.translated('general.helloX', {
                name: receiver.first_name ?? '',
            }),
            needsABabysitterText: instantJobTranslations.translated('instantJob.needsABabysitter', {
                name: sender.first_name ?? '',
            }),
            justSignedUpText: instantJobTranslations.translated('instantJob.justSignedUp'),
            instantJobDescriptionText: instantJobTranslations.translated(
                sender.customUser.pref_regular ? 'instantJob.description' : 'instantJob.descriptionOccasional',
                {
                    firstName: sender.first_name ?? '',
                    numberOfChildren: sender.customUser.children?.length.toString() ?? '',
                    distance: distanceFromSender.toString(),
                    searchesFormatted: preferredRolesArray.join(', '),
                    availabilityFormatted: availableDays.join(', '),
                },
            ),
            messageAndIntroduceText: instantJobTranslations.translated('instantJob.exploreProfile'),
            expiryText: instantJobTranslations.translated('instantJob.expiry', {
                date: `<b>${format(targetDate, 'MM/dd')}</b>`,
                time: `<b>${format(set(targetDate, { hours: 23, minutes: 59, seconds: 59 }), 'HH:mm')}</b>`,
                firstName: sender.first_name ?? '',
            }),
            aboutSenderText: instantJobTranslations.translated('instantJob.aboutSender', {
                firstName: sender.first_name ?? '',
            }),
            distanceText: instantJobTranslations.translated('instantJob.distanceFromYou', {
                distance: distanceFromSender.toString(),
            }),
            childrenText: childrenLine ?? '',
            lookingForText: `${instantJobTranslations.translated('instantJob.searchesFor')}: ${preferredRolesArray.join(', ')}`,
            needsSomeoneText: `${instantJobTranslations.translated('instantJob.needsSomeone')}: ${availableDays.join(', ')}`,
            aboutSender: `<i>"${sender.customUser.about}"</i>`,
            senderProfileUrl: EmailService.buildLink(LinksService.profileUrl(sender.customUser.webuser_url), utmTags, loginToken),
            websiteUrl,
            bottom: { link: unsubscribe },
        };
    }
}
