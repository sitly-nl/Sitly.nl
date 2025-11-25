import { Device } from './../models/device.model';
import { User } from './../models/user/user.model';
import { Message } from './../models/message.model';
import { request } from '../utils/util';
import { MessageType } from '../models/message.types';
import { TranslationsService, Translator } from './translations.service';
import { GoogleServices } from './google.service';
import { LocaleId } from '../models/locale.model';
import { SentryService } from './sentry.service';

export interface PushNotificationDataInterface {
    data:
        | { type: 'connection_invites' }
        | { type: `connection_invites.unused.${'daily' | 'weekly'}` }
        | { type: 'connection_invites.unviewed' }
        | {
              type: 'job_posting_start_time_exceed';
              jobPostingId?: unknown;
          }
        | {
              type: 'message';
              senderId: string;
              firstName: string;
              avatar?: string;
          }
        | { type: 'rating_reminder' };
    notification?: {
        title: string;
        body: string;
    };
    badge?: number;
}

export class PushNotificationService {
    static async sendToUsers(entities: { notification: PushNotificationDataInterface; user: User }[]) {
        await Promise.all(entities.map(entity => entity.user.customUser.loadRelationIfEmpty('devices')));
        const results = [];
        const chunkSize = 50;
        for (let i = 0; i < entities.length; i += chunkSize) {
            const chunk = entities.slice(i, i + chunkSize);
            const authToken = await GoogleServices.getAccessToken();
            results.push(
                ...(await Promise.all(
                    chunk.map(item =>
                        PushNotificationService.sendToDevices(item.notification, item.user.customUser.devices ?? [], authToken),
                    ),
                )),
            );
        }
        const notFound = results
            .flat()
            .flat()
            .filter((item): item is { device: Device; error: { code: number } } => 'error' in item && item.error?.code === 404);
        if (notFound.length > 0) {
            await entities[0].user.sequelize.models.Device.destroy({
                where: { instance_id: notFound.map(item => item.device.instance_id) },
            });
        }
        return results;
    }

    static async sendToDevices(notification: PushNotificationDataInterface, devices: Device[], token?: string) {
        const authToken = token ?? (await GoogleServices.getAccessToken());
        if (!authToken) {
            return [];
        }
        return await Promise.all(devices.map(device => PushNotificationService.sendToDevice(notification, device, authToken)));
    }

    private static async sendToDevice(notificationParams: PushNotificationDataInterface, device: Device, authToken: string) {
        let extraContent;
        if (notificationParams.notification) {
            let clickAction;
            switch (notificationParams.data.type) {
                case 'connection_invites':
                case 'job_posting_start_time_exceed':
                case 'rating_reminder':
                    clickAction = '/';
                    break;
                case 'message':
                    clickAction = `messages/${notificationParams.data.senderId}`;
                    break;
                case 'connection_invites.unused.daily':
                case 'connection_invites.unused.weekly':
                    clickAction = 'search';
                    break;
                case 'connection_invites.unviewed':
                    clickAction = 'invites';
                    break;
                default:
                    notificationParams.data satisfies never;
                    break;
            }
            const deviceSpecificNotification = {
                click_action: clickAction,
                ...(notificationParams.badge ? { notification_count: notificationParams.badge } : {}),
            };
            extraContent = {
                notification: notificationParams.notification,
                android: {
                    notification: deviceSpecificNotification,
                },
                webpush: {
                    notification: deviceSpecificNotification,
                },
                ...(notificationParams.badge
                    ? {
                          apns: {
                              payload: {
                                  aps: {
                                      badge: notificationParams.badge,
                                  },
                              },
                          },
                      }
                    : {}),
            };
        } else {
            extraContent = {
                apns: {
                    payload: {
                        aps: {
                            'content-available': 1, // hide it in the notification center;
                            'badge': notificationParams.badge,
                        },
                    },
                },
            };
        }

        const message = {
            token: device.fcm_token,
            data: notificationParams.data,
            ...extraContent,
        };

        const res = await request({
            method: 'POST',
            url: 'https://fcm.googleapis.com/v1/projects/sitly-app/messages:send',
            headers: {
                Authorization: `Bearer ${authToken}`,
            },
            json: { message },
        });
        if (res.statusCode >= 400) {
            // For 502 it returns html string instead of json in body
            if (res.statusCode >= 500) {
                SentryService.captureException(res.body, 'push-notification', device.brandCode);
            }
            return { error: res.body.error as { code: number } | undefined, device };
        } else {
            return res.body as { name: string };
        }
    }

    static async sendChatMessages(data: { message: Message; receiver: User; sender: User }[]) {
        const toSend = [];
        const translators = await PushNotificationService.getLocalizedTranslators(
            data.map(item => item.receiver),
            'pushNotification.title.',
        );
        for (const item of data) {
            const { message, receiver, sender } = item;
            const translator = translators.get(receiver.localeId);
            if (!translator) {
                throw new Error('translator not found');
            }

            const firstName = sender.first_name ?? '';
            const title =
                message.message_type === MessageType.instantJob
                    ? translator.translated('pushNotification.title.instantJob', { '{FIRSTNAME_SENDER}': firstName }, false)
                    : translator.translated('pushNotification.title.message', { '%s': firstName }, false);

            let content = message.content;
            if (message.message_type === MessageType.autoRejection) {
                content = await PushNotificationService.contentForAutoRejectionMessage(message, receiver);
            }
            toSend.push({
                notification: {
                    data: {
                        type: 'message',
                        senderId: sender.customUser.webuser_url,
                        firstName,
                        avatar: sender.getAvatarUrl(),
                    },
                    notification: {
                        title,
                        body: content ?? '',
                    },
                    badge: await PushNotificationService.badgeForUser(receiver),
                } as const,
                user: receiver,
            });
        }
        return PushNotificationService.sendToUsers(toSend);
    }

    static async sendConnectionInvite(user: User) {
        return PushNotificationService.sendToUsers([
            {
                notification: {
                    data: { type: 'connection_invites' },
                    badge: await PushNotificationService.badgeForUser(user),
                },
                user,
            },
        ]);
    }

    static async sendUnusedConnectionInvites(receivers: User[], type: 'daily' | 'weekly') {
        const translators = await PushNotificationService.getLocalizedTranslators(receivers, 'pushNotification.connectionInvites.unused');
        return PushNotificationService.sendToUsers(
            receivers.map(user => {
                const translator = translators.get(user.localeId);
                if (!translator) {
                    throw new Error('translator not found');
                }
                return {
                    notification: {
                        data: { type: `connection_invites.unused.${type}` },
                        notification: {
                            title: translator.translated(`pushNotification.connectionInvites.unused.${type}.title`),
                            body: translator.translated(`pushNotification.connectionInvites.unused.${type}.body`),
                        },
                    },
                    user,
                };
            }),
        );
    }

    static async sendUnviewedConnectionInvites(receivers: User[]) {
        const translators = await PushNotificationService.getLocalizedTranslators(
            receivers,
            'pushNotification.connectionInvites.unviewed.parent',
        );
        return PushNotificationService.sendToUsers(
            receivers.map(user => {
                const translator = translators.get(user.localeId);
                if (!translator) {
                    throw new Error('translator not found');
                }
                return {
                    notification: {
                        data: { type: 'connection_invites.unviewed' },
                        notification: {
                            title: translator.translated('pushNotification.connectionInvites.unviewed.parent.title'),
                            body: translator.translated('pushNotification.connectionInvites.unviewed.parent.subtitle'),
                        },
                    },
                    user,
                };
            }),
        );
    }

    private static async getLocalizedTranslators(receivers: User[], prefix: string) {
        const translators = new Map<LocaleId, Translator>();
        for (const receiver of receivers) {
            if (!translators.has(receiver.localeId)) {
                const translator = await TranslationsService.translator({
                    localeId: receiver.localeId,
                    groupName: 'api',
                    prefix,
                });
                translators.set(receiver.localeId, translator);
            }
        }
        return translators;
    }

    private static async badgeForUser(user: User) {
        const [messagesCount, invitesCount] = await Promise.all([
            user.sequelize.models.Message.getTotalUnreadMessagesCount(user.webuser_id),
            user.sequelize.models.ConnectionInvite.unviewedInvitesCount(user.webuser_id),
        ]);
        return messagesCount + invitesCount;
    }

    private static async contentForAutoRejectionMessage(message: Message, user: User) {
        const translator = await TranslationsService.translator({
            localeId: user.localeId,
            groupName: 'messages',
            prefix: 'autorejection.',
        });
        return translator.translated(message.content ?? '', { '[firstName]': message.sender_name ?? '' }, false);
    }
}
