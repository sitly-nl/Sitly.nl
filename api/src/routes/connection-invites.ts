import { Response } from 'express';
import { UserRequest } from '../services/auth.service';
import { BaseRoute } from './route';
import { SitlyRouter } from './sitly-router';
import { forbiddenError, notFoundError, rateLimitError } from '../services/errors';
import { config } from '../../config/config';
import { Op } from 'sequelize';
import { DateUtil } from '../utils/date-util';
import { serialize } from '../models/serialize/connection-invite-response';
import { CustomUserRelations } from '../models/user/custom-user.model';
import { validatePage } from './common-validators';
import { ConnectionInviteColumns, ConnectionInviteStatus } from '../models/connection-invite.model';
import { Util } from '../utils/util';
import { getModels } from '../sequelize-connections';
import { PushNotificationService } from '../services/push-notification.service';

export class ConnectionInviteRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.get<UserRequest>('/users/me/connection-invites', (req, res) => {
            return new ConnectionInviteRoute().index(req, res);
        });
        router.post<UserRequest>('/users/:receiverUrl/connection-invites', (req, res) => {
            return new ConnectionInviteRoute().create(req, res);
        });
        router.patch<UserRequest>('/users/me/connection-invites/:id', (req, res) => {
            return new ConnectionInviteRoute().update(req, res);
        });
    }

    async index(req: UserRequest, res: Response) {
        const actions = ['sent', 'received'] as const;
        const allowedIncludes = ['contactUser.children', 'contactUser.recommendations'];

        const filter = req.query.filter as { action: (typeof actions)[number]; createdBefore: string };
        const customUserIncludes: (keyof CustomUserRelations)[] = [];
        const page = validatePage({ req, optional: false });

        req.checkQuery('filter.action')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'filter.action is required',
            })
            .isIn(actions as never)
            .withMessage({
                code: 'INVALID_VALUE',
                title: `filter.action should be one of ${actions as never}`,
            });
        req.checkQuery('filter.createdBefore')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'filter.createdBefore is required',
            })
            .isISO8601()
            .withMessage({
                code: 'INVALID_FORMAT',
                title: 'filter.createdBefore should be in ISO8601 format',
            });
        req.checkQuery('include')
            .optional()
            .custom((value: string) => {
                for (const item of value ? value.split(',') : []) {
                    if (!allowedIncludes.includes(item)) {
                        return false;
                    }
                    customUserIncludes.push(item.replace('contactUser.', '') as keyof CustomUserRelations);
                }
                return true;
            })
            .withMessage({
                code: 'INVALID_VALUE',
                title: `include should be in ${allowedIncludes}`,
            });
        if ((await this.handleValidationResult(req, res)) || !page) {
            return;
        }

        const invites = await req.user.sequelize.models.ConnectionInvite.find({
            type: filter.action,
            userId: req.user.webuser_id,
            createdBefore: filter.createdBefore,
            page,
            customUserIncludes,
        });
        res.json(
            await serialize({
                model: invites.rows,
                contextUser: req.user,
                localeCode: req.locale,
                contactUser: filter.action === 'sent' ? 'receiver' : 'sender',
                meta: page.responseMeta(invites.count),
            }),
        );
    }

    async create(req: UserRequest, res: Response) {
        const models = req.user.sequelize.models;

        const receiver = await models.User.byUserUrl(req.params.receiverUrl);
        if (!receiver) {
            return notFoundError({ res, title: 'User to invite is not found' });
        }

        const brandConfig = config.getConfig(req.brandCode);
        const existingInvitesCount = await models.ConnectionInvite.count({
            where: {
                [Op.or]: [
                    { sender_id: req.user.webuser_id, receiver_id: receiver.webuser_id },
                    { receiver_id: req.user.webuser_id, sender_id: receiver.webuser_id },
                ],
                invite_status: {
                    [Op.ne]: ConnectionInviteStatus.expired,
                },
            },
        });
        if (existingInvitesCount > 0) {
            return forbiddenError({ res, title: 'Invite is already created' });
        }

        if (!req.user.isPremium) {
            const sentInvitesCount = await models.ConnectionInvite.count({
                where: {
                    sender_id: req.user.webuser_id,
                    created_at: {
                        [Op.gt]: DateUtil.startOfDay(brandConfig.timeZone),
                    },
                },
            });
            if (sentInvitesCount >= (brandConfig.invitesDailyLimit ?? 0)) {
                return rateLimitError({ res, title: 'Too many invites sent' });
            }
        } else {
            const connectionInvitesStatistic = await models.ConnectionInvite.getConnectionInvitesCountStatistic(req.user.webuser_id);
            if (
                connectionInvitesStatistic.last_day >= 30 ||
                connectionInvitesStatistic.last_week >= 100 ||
                connectionInvitesStatistic.last_28_days >= 200
            ) {
                return rateLimitError({ res, title: 'Too many invites sent' });
            }
        }

        await models.ConnectionInvite.create({
            sender_id: req.user.webuser_id,
            receiver_id: receiver.webuser_id,
        });
        PushNotificationService.sendConnectionInvite(receiver);

        res.status(201).json();
    }

    async update(req: UserRequest, res: Response) {
        const allowedStatuses = [ConnectionInviteStatus.ignored];

        req.checkBody('status')
            .optional()
            .isIn(allowedStatuses)
            .withMessage({
                code: 'INVALID_VALUE',
                title: `status should be one of ${allowedStatuses}`,
            });
        req.checkBody('viewed')
            .optional()
            .custom((value: unknown) => Util.isTruthy(value))
            .withMessage({
                code: 'INVALID_VALUE',
                title: 'viewed should have truthy value',
            });
        if (await this.handleValidationResult(req, res)) {
            return;
        }

        const invite = await getModels(req.brandCode).ConnectionInvite.findByPk(req.params.id);
        if (!invite) {
            return notFoundError({ res, title: 'Invite is not found' });
        }

        if (invite.sender_id !== req.user.webuser_id && invite.receiver_id !== req.user.webuser_id) {
            return forbiddenError({ res, title: 'This is not yours' });
        }

        const update = {} as Partial<ConnectionInviteColumns>;

        if (req.body.status) {
            if (invite.invite_status !== ConnectionInviteStatus.open) {
                return forbiddenError({ res, title: 'Status can be changed only for invite in open status' });
            }
            update.invite_status = req.body.status as ConnectionInviteStatus;
        }

        if (req.body.viewed) {
            if (invite.receiver_id !== req.user.webuser_id) {
                return forbiddenError({ res, title: 'Viewed can be changed only by receiver' });
            }
            update.viewed_at = new Date();
        }

        await invite.update(update);

        res.json(await serialize({ model: invite, contextUser: req.user, localeCode: req.locale }));
    }
}
