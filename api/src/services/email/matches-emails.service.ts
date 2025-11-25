import { SentryService } from './../sentry.service';
import { DateUtil } from '../../utils/date-util';
import { Util } from '../../utils/util';
import { SitlyToken } from '../../sitly-token';
import { EmailService } from './email.service';
import { CommonEmailsService, EmailUtmTags } from './common-emails.service';
import { UserNotificationMatchGroup } from '../../models/matches/user-match-group.model';
import { User } from '../../models/user/user.model';
import { LocaleId } from '../../models/locale.model';
import { TranslationsService, Translator } from '../translations.service';
import { config } from '../../../config/config';
import { isBefore, sub } from 'date-fns';
import { StringUtil } from '../../utils/string-util';
import { TrackingService } from '../tracking.service';
import { LinksService } from '../links.service';

export class MatchesEmailsService {
    static async sendMatchMail(groups: UserNotificationMatchGroup[]) {
        const filteredGroups = groups.filter(item => (item.matches?.length ?? 0) > 0);
        if (filteredGroups.length === 0) {
            return;
        }

        const brandConfigSettings = config.getConfig(filteredGroups[0].brandCode);

        const bulk = await Promise.all(
            filteredGroups.map(async group => {
                const receiver = group.user;
                const localeId = receiver.customUser.locale_id ?? LocaleId.en_GB;
                const utmTags = EmailUtmTags.tags('matchmail', receiver);
                const totalMatchesCount = group.total_matches;
                const suffix = `${receiver.roleName}.${totalMatchesCount <= 1 ? 'singular' : 'multiple'}`;
                const tempToken = SitlyToken.tempToken(receiver);
                let extraMatches: User[] = [];
                const matches = group.matches?.map(item => item.match) ?? [];
                if (matches.length > 6) {
                    extraMatches = matches.splice(6, matches.length - 6).slice(0, 3);
                }

                const [translator, websiteUrl, previousGroupCreatedSeq] = await Promise.all([
                    TranslationsService.translator({ localeId, groupName: 'emails', prefix: ['matchMail.', 'general.'] }),
                    CommonEmailsService.websiteUrl(receiver),
                    receiver.isParent
                        ? group.sequelize.models.UserNotificationMatchGroup.findOne({
                              attributes: ['created_at'],
                              where: { webuser_id: group.webuser_id },
                              order: [['created_at', 'DESC']],
                              offset: 1,
                          })
                        : undefined,
                ]);
                const weekly = isBefore(
                    // 24 hours + 11 hours margin for calculation deviations
                    previousGroupCreatedSeq?.created_at ?? receiver.created ?? new Date(),
                    sub(new Date(), { hours: 35 }),
                );
                const extraMatchesMapped = extraMatches.map(match => {
                    return {
                        avatar: match.getAvatarUrl(300, true),
                        profileUrl: EmailService.buildTrackingLink({
                            baseUrl: LinksService.profileUrl(match.customUser.webuser_url),
                            param: { element_type: 'matchmail', element_description: 'view_profile' },
                            receiver,
                            utmTags,
                            tempToken,
                        }),
                    };
                });

                return {
                    receiver,
                    params: {
                        mailSubject: translator.translated(`matchMail.subject.${suffix}`, { matchesCount: `${totalMatchesCount}` }),
                        websiteUrl: EmailService.buildTrackingLink({
                            baseUrl: websiteUrl,
                            param: { element_type: 'matchmail', element_description: 'logo' },
                            receiver,
                            utmTags,
                        }),
                        blueAccent: receiver.isParent,
                        yellowAccent: !receiver.isParent,
                        title: translator.translated(`matchMail.title.${suffix}`, { matchesCount: `${totalMatchesCount}` }),
                        subTitle0: translator.translated(`matchMail.subTitle0.${receiver.isParent ? 'parent' : 'babysitter'}`),
                        subTitle1: receiver.isParent
                            ? translator.translated(`matchMail.subTitle1.parent.${weekly ? 'weekly' : 'daily'}`)
                            : undefined,
                        matches: this.mappedMatches(receiver, matches, translator, utmTags, tempToken),
                        extraMatches: extraMatchesMapped,
                        bottomSection: CommonEmailsService.generalBottomSection(receiver, translator, brandConfigSettings, 'matchmail'),
                        bottomTitle: translator.translated(`matchMail.bottom.title.${receiver.isParent ? 'parent' : 'babysitter'}`),
                        bottomSubTitle: translator.translated(`matchMail.bottom.subtitle.${receiver.isParent ? 'parent' : 'babysitter'}`),
                        viewAllLabel: translator.translated('matchMail.viewAllMatches'),
                        viewAllUrl: EmailService.buildTrackingLink({
                            baseUrl: LinksService.searchUrl(),
                            param: { element_type: 'matchmail', element_description: 'view_all_profiles' },
                            receiver,
                            utmTags,
                            tempToken,
                        }),
                    },
                };
            }),
        );

        try {
            const res = await EmailService.sendTemplateBulk('matchmail', bulk);
            Promise.all(bulk.map(item => TrackingService.trackEmailSent(item.receiver, 'matchmail')));
            await Promise.all(
                (res?.Status ?? []).map((status, index) => {
                    return groups[index].update({ sent: status.MessageId ? 1 : 2 });
                }),
            );
            return res;
        } catch (error) {
            console.log(error);
            SentryService.captureException(error, 'matchmail.send', groups[0]?.brandCode);
        }
    }

    private static mappedMatches(
        receiver: User,
        matchedUsers: User[],
        translator: Translator,
        utmTags: Record<string, string>,
        tempToken: string,
    ) {
        return matchedUsers.map(match => {
            const { map_latitude, map_longitude } = match.customUser;
            const availabilityPrefix = match.isParent ? 'pref' : 'foster';
            const availability = Util.aggregatedDescription(
                [
                    match.customUser[`${availabilityPrefix}_regular`] ? 'regular' : undefined,
                    match.customUser[`${availabilityPrefix}_occasional`] ? 'occasional' : undefined,
                    match.customUser[`${availabilityPrefix}_after_school`] ? 'afterSchool' : undefined,
                ]
                    .filter(Boolean)
                    .map(item => translator.translated(`general.availability.${item}`)),
            );
            const hideAvailabilityCalendar =
                match.isParent &&
                match.customUser.pref_occasional &&
                DateUtil.weekDays.every(weekDay => {
                    return (match.customUser[`${availabilityPrefix}_${weekDay}`]?.length ?? 0) === 0;
                });

            return {
                avatar: match.getAvatarUrl(300, true),
                topMatchesLabel: translator.translated('matchMail.topMatches'),
                line0: `${match.first_name}${match.isParent ? '' : ` • ${match.age}`}`,
                line1: translator.translated('matchMail.distanceLine', {
                    distance: `${receiver.getDistance(map_latitude, map_longitude)}`,
                }),
                line2: match.isParent
                    ? match.customUser.children
                          ?.filter(item => item.gender !== 'u')
                          .map(
                              item =>
                                  `${StringUtil.capitalizeFirstLetter(
                                      translator.translated(item.gender === 'm' ? 'general.boy' : 'general.girl'),
                                  )} • ${item.age}`,
                          )
                          .join(', ')
                    : match.customUser.type_experience
                          ?.split(',')
                          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
                          .map(item => translator.translated(`general.typeExperience.${item}`))
                          .join(' • '),
                line3: availability ? translator.translated('matchMail.availability.format', { availability }) : undefined,
                availabilityDays: hideAvailabilityCalendar
                    ? undefined
                    : DateUtil.weekDays.map(item => {
                          return {
                              title: translator.translated(`general.${item}.short`),
                              selected: match.customUser[`${availabilityPrefix}_${item}`]?.match(/[1-3]/),
                          };
                      }),
                profileUrl: EmailService.buildTrackingLink({
                    baseUrl: LinksService.profileUrl(match.customUser.webuser_url),
                    param: { element_type: 'matchmail', element_description: 'view_profile' },
                    receiver,
                    utmTags,
                    tempToken,
                }),
                viewDetailsLabel: translator.translated('matchMail.viewProfile'),
            };
        });
    }
}
