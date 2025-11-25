import { Response } from 'express';
import { UserRequest } from '../../services/auth.service';
import { BaseRoute } from '../route';
import { SitlyRouter } from '../sitly-router';
import { serialize } from '../../models/serialize/notification-preferences-response';
import { notFoundError, unprocessableEntityError } from '../../services/errors';
import { NotificationFrequency } from '../../models/user/notification-settings.model';
import { z } from 'zod';

export class NotificationPreferencesRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.get<UserRequest>('/users/me/notification-preferences', (req, res) => {
            return new NotificationPreferencesRoute().index(req, res);
        });
        router.patch<UserRequest>('/users/me/notification-preferences', (req, res) => {
            return new NotificationPreferencesRoute().update(req, res);
        });
    }

    async index(req: UserRequest, res: Response) {
        const notificationSettings = (await req.user.reload({ include: 'notificationSettings' })).notificationSettings;
        if (!notificationSettings) {
            return notFoundError({ res, title: 'Notification preferences not found' });
        }
        res.json(serialize(notificationSettings));
    }

    async update(req: UserRequest, res: Response) {
        try {
            const update = z
                .object({
                    emailMatches: z.nativeEnum(NotificationFrequency).optional(),
                    emailConnectionInvites: z.nativeEnum(NotificationFrequency).optional(),
                })
                .parse(req.body);
            if (Object.keys(update).length === 0) {
                return unprocessableEntityError({ res, title: 'No fields to update' });
            }

            const notificationSettings = (await req.user.reload({ include: 'notificationSettings' })).notificationSettings;
            if (!notificationSettings) {
                return notFoundError({ res, title: 'Notification preferences not found' });
            }

            await notificationSettings.update({
                ...(update.emailMatches ? { email_matches: update.emailMatches } : {}),
                ...(update.emailConnectionInvites ? { email_connection_invites: update.emailConnectionInvites } : {}),
            });

            res.json(serialize(notificationSettings));
        } catch (error) {
            this.handleError(req, res, error);
        }
    }
}
