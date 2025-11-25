import { BrandCode } from '../models/brand-code';
import { UserSearchElastic, UserSearchParams } from '../search/user-search-elastic';
import { Util } from '../utils/util';
import { MatchesEmailsService } from './email/matches-emails.service';
import { SlackChannels, SlackNotifications } from './slack-notifications.service';
import { MatchmailSetting } from '../models/user/custom-user.model';
import { DateUtil } from '../utils/date-util';
import { getModels, maxPageSize } from '../sequelize-connections';
import { SentryService } from './sentry.service';
import { Op, Sequelize } from 'sequelize';
import { User, WebRoleName } from '../models/user/user.model';
import { isAfter, sub } from 'date-fns';

export class MatchNotificationService {
    static async calculateMatches(brandCode: BrandCode, interval: 'daily' | 'weekly', sitlyUsersOnly = true) {
        const NOW = Sequelize.fn('NOW');
        const where = {
            where: [{ active: 1 }, { email: { [Op.notLike]: '' } }, sitlyUsersOnly ? { email: { [Op.endsWith]: '@sitly.com' } } : {}],
            include: {
                association: 'customUser',
                where: [
                    {
                        deleted: 0,
                        completed: 1,
                        inappropriate: 0,
                    },
                    {
                        [Op.or]: [
                            { disabled: 0 },
                            {
                                disabled: 1,
                                disabled_by: 'system',
                                premium: { [Op.gt]: NOW },
                            },
                        ],
                    },
                    {
                        [Op.or]: [
                            { message_rate_limit_exceeded_at: null },
                            {
                                message_rate_limit_exceeded_at: {
                                    [Op.lt]: Sequelize.fn('DATE_SUB', NOW, Sequelize.literal('INTERVAL 1 DAY')),
                                },
                            },
                        ],
                    },
                    interval === 'daily'
                        ? {
                              [Op.or]: [
                                  { automatch_mail: MatchmailSetting.daily },
                                  Sequelize.literal(
                                      `automatch_mail = ${MatchmailSetting.weekly} AND ` +
                                          'FROM_UNIXTIME(User.created) > NOW() - INTERVAL 1 WEEK AND ' +
                                          "LOWER(DAYNAME(NOW())) <> 'monday'",
                                  ),
                                  Sequelize.literal(
                                      `automatch_mail = ${MatchmailSetting.weekly} AND ` +
                                          'FROM_UNIXTIME(User.created) > NOW() - INTERVAL 2 WEEK AND ' +
                                          'FROM_UNIXTIME(User.created) < NOW() - INTERVAL 1 WEEK AND ' +
                                          'MOD(DAY(NOW()), 2) <> 0 AND ' +
                                          "LOWER(DAYNAME(NOW())) <> 'monday'",
                                  ),
                              ],
                          }
                        : {
                              automatch_mail: MatchmailSetting.weekly,
                          },
                ],
            },
        };

        const pageSize = maxPageSize;
        let page = 0;
        while (true) {
            const users = await getModels(brandCode).User.findAll({
                ...where,
                offset: page * pageSize,
                limit: pageSize,
            });

            const chunkSize = 2;
            for (let index = 0; index < users.length; index += chunkSize) {
                try {
                    const chunk = users.slice(index, index + chunkSize);
                    await Promise.all(chunk.map(user => MatchNotificationService.calculateMatchesForUser(user)));
                } catch (error) {
                    console.log(error);
                    SentryService.captureException(error, 'matchmail.calculate', brandCode);
                }

                if (index % 50 === 0) {
                    await Util.wait(100); // let elastic have some rest
                }
            }

            ++page;

            if (users.length < pageSize) {
                break;
            }
        }
    }

    static async calculateMatchesForUser(user: User) {
        const { map_latitude, map_longitude } = user.customUser;
        if (!map_latitude || !map_longitude || user.webrole_id === null) {
            return;
        }

        // created after
        const weekAgo = sub(new Date(), { weeks: 1 });
        const lastAutoMatch = user.customUser.last_automatch;
        const createdAfter = lastAutoMatch && isAfter(lastAutoMatch, weekAgo) ? lastAutoMatch : weekAgo;

        // recent users
        const params = {
            ...MatchNotificationService.defaultSearchParams(user),
            created_after: createdAfter.toISOString(),
            distance: user.customUser.pref_max_distance,
            limit: 9,
            sort: 'avatar,distance',
        };
        const userSearch = new UserSearchElastic(user.brandCode, user.localeId, { latitude: map_latitude, longitude: map_longitude });
        const searchResult = await userSearch.getElasticUsers(params, {});

        const elasticMatchesIds = searchResult.hits.hits.map(item => item._id);
        if (elasticMatchesIds.length === 0) {
            return;
        }

        const models = user.sequelize.models;

        // check existence in db
        const matchesIds = (
            await models.User.findAll({
                where: { webuser_id: elasticMatchesIds },
                order: Sequelize.literal(`FIELD(User.webuser_id, ${elasticMatchesIds.join(',')})`),
                attributes: ['webuser_id'],
                raw: true,
            })
        ).map(item => item.webuser_id);
        if (matchesIds.length === 0) {
            return;
        }

        const now = new Date();
        await user.customUser.update({ last_automatch: now });

        const group = await models.UserNotificationMatchGroup.create({
            webuser_id: user.webuser_id,
            created_at: now,
            total_matches: matchesIds.length < searchResult.hits.total.value ? matchesIds.length : searchResult.hits.total.value,
        });
        await models.UserNotificationMatch.bulkCreate(
            matchesIds.map((id, index) => {
                return {
                    webuser_id: id,
                    group_id: group.match_group_id,
                    instance_order: index,
                };
            }),
        );

        return group;
    }

    private static defaultSearchParams(user: User) {
        const params: UserSearchParams = {};

        if (user.isParent) {
            const roles = [];
            if (user.customUser.pref_childminder) {
                roles.push(WebRoleName.childminder);
            }
            if (user.customUser.pref_babysitter) {
                roles.push(WebRoleName.babysitter);
            }
            if (roles.length === 0) {
                roles.push(WebRoleName.babysitter, WebRoleName.childminder);
            }
            params.roles = roles;
        } else {
            params.role = WebRoleName.parent;
            params.looking_for = user.roleName;

            const { pref_min_age, pref_max_age } = user.customUser;
            if (pref_max_age >= 0) {
                params.age_of_children = {
                    min: Math.max(pref_min_age, 0),
                    max: pref_max_age,
                };
            }
        }

        return params;
    }

    static async sendEmails(brandCode: BrandCode) {
        const start = new Date();
        let message = `*Send matchmails - ${brandCode} - matchmail:*`;

        const pageSize = maxPageSize;
        let count = pageSize;
        while (count === pageSize) {
            const groups = await getModels(brandCode).UserNotificationMatchGroup.matchesToSend(pageSize);
            const groupsLoadingTime = DateUtil.formattedInterval((new Date().getTime() - start.getTime()) / 1000);
            const chunkSize = 50;
            for (let i = 0; i < groups.length; i += chunkSize) {
                const chunk = groups.slice(i, i + chunkSize);
                await MatchesEmailsService.sendMatchMail(chunk);
            }
            count = groups.length;
            message += `\nrows_count=${count}, total_time_from_start=\`${DateUtil.formattedInterval(
                (new Date().getTime() - start.getTime()) / 1000,
            )}\`, groups_loading_time=\`${groupsLoadingTime}\``;
        }

        await SlackNotifications.send(message, SlackChannels.cronMonitoring);
    }
}
