import { readFileSync } from 'fs';
import * as moment from 'moment';
import { config } from '../../../config/config';
import { User } from '../../models/user/user.model';
import { SitlyToken } from '../../sitly-token';
import { ChildProcessService } from '../child-process.service';
import { Files } from '../files.service';
import { EmailService, EmailType } from './email.service';
import { LinksService } from '../links.service';
import { TranslationsService, Translator } from '../translations.service';
import { ConfigInterface } from '../../../config/config-interface';

export class EmailUtmTags {
    static tags(type: EmailType, user: User): Record<string, string> {
        switch (type) {
            case 'change-avatar':
            case 'connection-invites':
            case 'forgot-password':
            case 'login-link':
            case 'non-response-victim':
            case 'payment-cancellation':
            case 'payment-invoice':
            case 'personal-data-warning':
            case 'recommendation':
            case 'underaged':
                return {
                    utm_source: 'Mailings',
                    utm_medium: 'email',
                    utm_content: type,
                    utm_campaign: type,
                };
            case 'chat-message-notification-v2':
                return {
                    utm_source: 'sitly_mail',
                    utm_medium: 'email',
                    utm_campaign: 'all-all-sitly_mail-customer_support-broad_all_all_all_ages_engagement-chat_message_notification-',
                    utm_content: 'email-chat_message',
                };
            case 'complete-registration-reminder':
                return {
                    utm_source: 'sitly_mail',
                    utm_medium: 'email',
                    utm_campaign: 'all-all-sitly_mail-customer_support-broad_all_all_all_ages_signup-complete_registration_email-',
                    utm_content: 'email-complete_registration',
                };
            case 'instant-job-notification':
                return {
                    utm_source: 'sitly_mail',
                    utm_medium: 'email',
                    utm_campaign: 'all-all-sitly_mail-customer_support-broad_all_all_all_ages_engagement-instant_job_notification-',
                    utm_content: 'email-chat_message',
                };
            case 'matchmail':
                return user.isParent
                    ? {
                          utm_source: 'sitly_mail',
                          utm_medium: 'email',
                          utm_campaign: 'all-parents-sitly_mail-reactivation--matchmail-a',
                          utm_content: 'matchmail-email--standard_template',
                      }
                    : {
                          utm_source: 'sitly_mail',
                          utm_medium: 'email',
                          utm_campaign: 'all-sitters-sitly_mail-reactivation--matchmail-a',
                          utm_content: 'matchmail-email--standard_template',
                      };
            case 'reactivation':
                return {
                    utm_source: 'sitly_mail',
                    utm_medium: 'email',
                    utm_campaign: 'all-parents-sitly_mail-reactivation--nosearch_noprem_1d-',
                    utm_content: 'premium_reactivation-email--standard_template-new_babysitter',
                };
            default:
                return type satisfies never;
        }
    }
}

export class CommonEmailsService {
    static async sendPaymentInvoice(paymentId: number, user: User) {
        const localeId = user.localeId;
        const utmTags = EmailUtmTags.tags('payment-invoice', user);

        const [translator, loginSection, websiteUrl] = await Promise.all([
            TranslationsService.translator({ localeId, groupName: 'emails', prefix: 'premiumInvoice' }),
            CommonEmailsService.loginSection(user, utmTags),
            CommonEmailsService.websiteUrl(user),
        ]);

        const bodyString = readFileSync('./src/views/emails/invoice.html', 'utf8')
            .replace('{{websiteUrl}}', EmailService.buildLink(websiteUrl, utmTags))
            .replace(
                '{{textBody}}',
                translator.translated(
                    'premiumInvoice',
                    {
                        '[firstName]': user.first_name ?? '',
                    },
                    false,
                ),
            )
            .replace('{{bottom.link.url}}', loginSection.url)
            .replace('{{bottom.link.title}}', loginSection.title);

        const pdfInput = {
            userId: user.webuser_id,
            paymentId,
            localeId,
            brandCode: user.brandCode,
        };
        ChildProcessService.getPdf(pdfInput, readStream => {
            if (readStream) {
                EmailService.sendRawEmail(user, {
                    subject: translator.translated('premiumInvoice.subject'),
                    html: bodyString,
                    attachments: [
                        {
                            filename: 'receipt.pdf',
                            content: readStream,
                        },
                    ],
                });
            }
        });
    }

    static async sendPaymentCancellation(user: User) {
        const utmTags = EmailUtmTags.tags('payment-cancellation', user);
        const localeId = user.localeId;
        const [translator, websiteUrl, loginSection, locale] = await Promise.all([
            TranslationsService.translator({ localeId, groupName: 'emails', prefix: 'subscriptionCancelled' }),
            CommonEmailsService.websiteUrl(user),
            CommonEmailsService.loginSection(user, utmTags),
            await user.sequelize.models.Locale.byId(localeId),
        ]);
        return EmailService.sendTemplate(user, 'payment-cancellation', {
            mailSubject: translator.translated('subscriptionCancelled.subject'),
            textBody: translator.translated(
                'subscriptionCancelled',
                {
                    '[first_name]': user.first_name ?? '',
                    '[date]': moment(user.customUser.premium)
                        .locale(locale?.locale_code ?? 'en')
                        .format('DD MMMM YYYY'),
                },
                false,
            ),
            websiteUrl: EmailService.buildLink(websiteUrl, utmTags),
            bottom: { link: loginSection },
        });
    }

    static async sendDeleteUnderagedEmail(user: User) {
        const translator = await TranslationsService.translator({
            localeId: user.localeId,
            groupName: 'emails',
            prefix: 'deleteUnderaged',
        });
        const websiteUrl = await CommonEmailsService.websiteUrl(user);
        const utmTags = EmailUtmTags.tags('underaged', user);
        return EmailService.sendTemplate(user, 'underaged', {
            mailSubject: translator.translated('deleteUnderaged.subject'),
            textBody: translator.translated(
                'deleteUnderaged.content',
                {
                    '[name]': user.first_name ?? '',
                    '[age]': `${config.getConfig(user.brandCode).babysitterMinAge}`,
                },
                false,
            ),
            websiteUrl: EmailService.buildLink(websiteUrl, utmTags),
        });
    }

    static async sendReactivationEmail(users: User[]) {
        return EmailService.sendTemplateBulkToUsers('reactivation', users, async user => {
            const utmTags = EmailUtmTags.tags('reactivation', user);

            const [translator, websiteUrl, header, unsubscribe] = await Promise.all([
                TranslationsService.translator({
                    localeId: user.localeId,
                    groupName: 'emails',
                    prefix: 'reactivation.',
                }),
                CommonEmailsService.websiteUrl(user),
                CommonEmailsService.getDefaultHeader(user),
                CommonEmailsService.unsubscribeSection(user),
            ]);

            const loginToken = SitlyToken.tempToken(user);
            const premiumUrl = EmailService.buildLink(LinksService.premiumUrl(), utmTags, loginToken);
            const unlockHtml = `<a href="${premiumUrl}" style="target="_blank">
                <b style="font-weight:600;">${translator.translated('reactivation.unlockPremium')}</b>
            </a>`;

            return {
                mailSubject: translator.translated('reactivation.subject.parent'),
                bottom: { link: unsubscribe },
                header,
                websiteUrl: EmailService.buildLink(websiteUrl, utmTags),
                topParagraph: translator.translated('reactivation.topParagraph', { firstName: user.first_name ?? '' }),
                unlockPremium: translator.translated('reactivation.unlockPremiumTo', { cta: unlockHtml }),
                bodyLines: [0, 1, 2, 3].map(index => {
                    return {
                        title: translator.translated(`reactivation.body.line${index}.title`),
                        text: translator.translated(`reactivation.body.line${index}.text`),
                    };
                }),
                premiumUrl,
                premiumCtaTitle: translator.translated('reactivation.premiumCta.title'),
                bottomParagraph: translator.translated('reactivation.bottomParagraph'),
            };
        });
    }

    static async sendForgotPassword(user: User, url: string) {
        const translator = await TranslationsService.translator({
            localeId: user.localeId,
            groupName: 'emails',
            prefix: 'passwordReset.',
        });
        const websiteUrl = await CommonEmailsService.websiteUrl(user);
        const utmTags = EmailUtmTags.tags('forgot-password', user);
        return EmailService.sendTemplate(user, 'forgot-password', {
            mailSubject: translator.translated('passwordReset.subject'),
            textBody: translator.translated(
                'passwordReset.content',
                {
                    '[Name]': user.first_name ?? '',
                    '[url]': url,
                },
                false,
            ),
            websiteUrl: EmailService.buildLink(websiteUrl, utmTags),
        });
    }

    static async sendLoginLink(user: User, url: string) {
        const translator = await TranslationsService.translator({
            localeId: user.localeId,
            groupName: 'emails',
            prefix: 'loginLink.',
        });
        const websiteUrl = await CommonEmailsService.websiteUrl(user);
        const utmTags = EmailUtmTags.tags('login-link', user);
        return EmailService.sendTemplate(user, 'login-link', {
            mailSubject: translator.translated('loginLink.subject'),
            textBody: translator.translated('loginLink.content', { '[url]': url }, false),
            websiteUrl: EmailService.buildLink(websiteUrl, utmTags),
        });
    }

    static async sendPersonalDataWarning(user: User) {
        const utmTags = EmailUtmTags.tags('personal-data-warning', user);
        const [translator, websiteUrl, loginSection] = await Promise.all([
            TranslationsService.translator({
                localeId: user.localeId,
                groupName: 'emails',
                prefix: 'personalDataWarning',
            }),
            CommonEmailsService.websiteUrl(user),
            CommonEmailsService.loginSection(user, utmTags),
        ]);
        return EmailService.sendTemplate(user, 'personal-data-warning', {
            mailSubject: translator.translated('personalDataWarning.subject'),
            textBody: translator.translated(
                'personalDataWarning',
                {
                    '{FIRSTNAME}': user.first_name ?? '',
                },
                false,
            ),
            websiteUrl: EmailService.buildLink(websiteUrl, utmTags),
            bottom: { link: loginSection },
        });
    }

    static async sendChangeAvatar(users: User[]) {
        return EmailService.sendTemplateBulkToUsers('change-avatar', users, async user => {
            const utmTags = EmailUtmTags.tags('change-avatar', user);
            const [translator, websiteUrl, loginSection] = await Promise.all([
                TranslationsService.translator({
                    localeId: user.localeId,
                    groupName: 'emails',
                    prefix: 'changeAvatar.',
                }),
                CommonEmailsService.websiteUrl(user),
                CommonEmailsService.loginSection(user, utmTags),
            ]);
            return {
                mailSubject: translator.translated('changeAvatar.subject'),
                textBody: translator.translated(
                    'changeAvatar.contents',
                    {
                        '[name]': user.first_name ?? '',
                        '[uploadAvatarUrl]': EmailService.buildLink(LinksService.settingsUrl(user), utmTags),
                    },
                    false,
                ),
                textBodyFormatted: true,
                websiteUrl: EmailService.buildLink(websiteUrl, utmTags),
                bottom: { link: loginSection },
            };
        });
    }

    static async sendRecommendation(user: User, email: string, recipientName: string, message: string, recommendationLink: string) {
        const [translator, websiteUrl] = await Promise.all([
            TranslationsService.translator({
                localeId: user.localeId,
                groupName: 'emails',
                prefix: 'recommendation.',
            }),
            CommonEmailsService.websiteUrl(user),
        ]);
        const utmTags = EmailUtmTags.tags('recommendation', user);
        const firstName = user.first_name ?? '';
        return EmailService.sendTemplate({ email, brandCode: user.brandCode }, 'recommendation', {
            mailSubject: translator.translated('recommendation.subject', { '[firstName]': firstName }, false),
            websiteUrl: EmailService.buildLink(websiteUrl, utmTags),
            title: translator.translated('recommendation.title', { '[recipientName]': recipientName }, false),
            subtitle: translator.translated(
                'recommendation.subtitle.' + (user.customUser.gender === 'm' ? 'male' : 'female'),
                { '[senderName]': firstName },
                false,
            ),
            senderAvatarUrl: user.getAvatarUrl(200) ?? '',
            recommendationLink,
            message,
            recommendationCtaTitle: translator.translated('recommendation.cta.title', { '[senderName]': firstName }, false),
            recommendationCtaButtonTitle: translator.translated('recommendation.cta.button.title'),
            whatIsSitly: translator.translated('recommendation.what-is-sitly'),
            whatIsSitlyDescription: translator.translated('recommendation.what-is-sitly.description'),
            bottomLine: translator.translated(
                'recommendation.bottom.link',
                {
                    '[senderName]': firstName,
                    '[site]': Files.brands.find(item => item.id === user.brandCode)?.name ?? 'Sitly',
                },
                false,
            ),
            bestRegards: translator.translated('recommendation.bestRegards'),
        });
    }

    static sendNonResponseVictim(users: User[]) {
        return EmailService.sendTemplateBulkToUsers('non-response-victim', users, user =>
            CommonEmailsService.nonResponseVictimEmailParams(user),
        );
    }

    static async nonResponseVictimEmailParams(user: User, usePlaceholderForLinks = false) {
        const utmTags = EmailUtmTags.tags('non-response-victim', user);
        const [translator, websiteUrl, unsubscribeSection, nonResponseHeader] = await Promise.all([
            TranslationsService.translator({
                localeId: user.localeId,
                groupName: 'emails',
                prefix: 'nonResponse.',
            }),
            CommonEmailsService.websiteUrl(user),
            CommonEmailsService.unsubscribeSection(user),
            CommonEmailsService.getDefaultHeader(user),
        ]);
        return {
            mailSubject: translator.translated('nonResponse.subject'),
            title: translator.translated('nonResponse.title'),
            nonResponseHeader,
            paragraph0Title: translator.translated('nonResponse.paragraph0.title'),
            paragraph0Content: translator.translated('nonResponse.paragraph0.content'),
            paragraph1Title: translator.translated('nonResponse.paragraph1.title'),
            paragraph1Bullet0: translator.translated('nonResponse.paragraph1.bullet0'),
            paragraph1Bullet1: translator.translated('nonResponse.paragraph1.bullet1'),
            paragraph1Bullet2: translator.translated('nonResponse.paragraph1.bullet2'),
            paragraph2Title: translator.translated('nonResponse.paragraph2.title'),
            paragraph2Subtitle0: translator.translated('nonResponse.paragraph2.subtitle0'),
            paragraph2Content0: translator.translated(
                'nonResponse.paragraph2.content0',
                { '[link]': usePlaceholderForLinks ? '_sitly-link-emailSettings_' : unsubscribeSection.url },
                false,
            ),
            paragraph2Subtitle1: translator.translated('nonResponse.paragraph2.subtitle1'),
            paragraph2Content1: translator.translated(
                'nonResponse.paragraph2.content1',
                { '[link]': usePlaceholderForLinks ? '_sitly-link-recommendations_' : LinksService.recommendationUrl(user) },
                false,
            ),
            paragraph2Subtitle2: translator.translated('nonResponse.paragraph2.subtitle2'),
            paragraph2Content2: translator.translated('nonResponse.paragraph2.content2'),
            paragraph2Subtitle3: translator.translated('nonResponse.paragraph2.subtitle3'),
            paragraph2Content3: translator.translated(
                'nonResponse.paragraph2.content3',
                { '[link]': usePlaceholderForLinks ? '_sitly-link-profile_' : LinksService.settingsUrl(user) },
                false,
            ),
            websiteUrl: EmailService.buildLink(websiteUrl, utmTags),
            bottom: { link: unsubscribeSection },
        };
    }

    static sendCompleteRegistrationReminder(users: User[]) {
        return EmailService.sendTemplateBulkToUsers('complete-registration-reminder', users, async user => {
            const utmTags = EmailUtmTags.tags('complete-registration-reminder', user);
            const [translator, websiteUrl, loginSection] = await Promise.all([
                TranslationsService.translator({ localeId: user.localeId, groupName: 'emails', prefix: 'activationNotCompleted' }),
                CommonEmailsService.websiteUrl(user),
                CommonEmailsService.loginSection(user, utmTags),
            ]);

            return {
                mailSubject: translator.translated('activationNotCompleted.subject'),
                textBody: translator.translated(
                    'activationNotCompleted',
                    {
                        '{FIRSTNAME}': user.first_name ?? '',
                        '{ACTIVATION_URL}': LinksService.completionUrl(user),
                    },
                    false,
                ),
                textBodyFormatted: true,
                websiteUrl: EmailService.buildLink(websiteUrl, utmTags),
                bottom: { link: loginSection },
            };
        });
    }

    // ----- Internal ------ //
    static async websiteUrl(user: User) {
        return LinksService.localizedWebsiteUrl(user.brandCode, user.localeId);
    }

    private static async getDefaultHeader(user: User) {
        return TranslationsService.singleTranslation({
            localeId: user.localeId,
            groupName: 'emails',
            code: 'main.header',
        });
    }

    static async unsubscribeSection(user: User) {
        return {
            url: LinksService.accountSettingsUrl(user),
            title: await TranslationsService.singleTranslation({
                localeId: user.localeId,
                groupName: 'emails',
                code: 'main.emailSettings',
            }),
        };
    }

    static generalBottomSection(receiver: User, translator: Translator, brandConfigSettings: ConfigInterface, emailType: EmailType) {
        const socialPages = {
            facebook: LinksService.redirectionLink(receiver, brandConfigSettings.socialPages.facebook, {
                element_category: 'email',
                element_type: emailType,
                element_description: 'facebook',
            }),
            instagram: LinksService.redirectionLink(receiver, brandConfigSettings.socialPages.instagram, {
                element_category: 'email',
                element_type: emailType,
                element_description: 'instagram',
            }),
        };
        const appLinks = {
            ios: LinksService.redirectionLink(receiver, brandConfigSettings.appstoreUrl, {
                element_category: 'email',
                element_type: emailType,
                element_description: 'app_store',
            }),
            android: LinksService.redirectionLink(receiver, 'https://play.google.com/store/apps/details?id=com.sitly.app', {
                element_category: 'email',
                element_type: emailType,
                element_description: 'google_play',
            }),
        };
        const bottomLink = translator.translated('general.bottomLink', {
            profileSettingsLink: `<a href="${LinksService.redirectionLink(receiver, LinksService.accountSettingsUrl(receiver), {
                element_category: 'email',
                element_type: emailType,
                element_description: 'profile_settings',
            })}" style="color:#22313e;text-decoration:underline;" target="_blank" class="dark">${translator.translated(
                'general.profileSettings',
            )}</a>`,
        });
        return {
            socialPages,
            copyright: translator.translated('general.copyright', { year: `${new Date().getFullYear()}` }),
            getApp: translator.translated('general.getApp'),
            appLinks,
            bottomLink,
        };
    }

    static async loginSection(user: User, utmTags: Record<string, string>) {
        return {
            url: EmailService.buildLink(LinksService.webAppBaseUrl, utmTags),
            title: await TranslationsService.singleTranslation({
                localeId: user.localeId,
                groupName: 'emails',
                code: 'main.loginToSitly',
            }),
        };
    }
}
