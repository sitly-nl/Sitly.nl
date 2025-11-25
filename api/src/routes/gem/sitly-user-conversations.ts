import { SitlyRouter } from '../sitly-router';
import { Request, Response } from 'express';
import { MessageType } from '../../models/message.types';
import { serializeMessages } from '../messages/messages.serializer';
import { serializeConversations } from '../messages/conversations.serializer';
import { BaseRoute } from '../route';
import { notFoundError } from '../../services/errors';
import { ConversationResponse } from '../../models/serialize/conversation-response';
import { getModels } from '../../sequelize-connections';

export class GemSitlyUserConversationsRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.get('/gem/sitly-users/:userId/conversations', (req, res) => {
            return new GemSitlyUserConversationsRoute().listConversations(req, res);
        });

        router.get('/gem/sitly-users/:userId/conversations/:partnerId/messages', (req, res) => {
            return new GemSitlyUserConversationsRoute().listMessages(req, res);
        });
    }

    async listConversations(req: Request, res: Response) {
        const models = getModels(req.brandCode);

        const requestUser = await models.User.byId(parseInt(req.params.userId, 10), { includeInactive: true });
        if (!requestUser) {
            return notFoundError({ res, title: 'User not found' });
        }

        const conversations = await models.ConversationWrapperOld.getConversations(parseInt(req.params.userId, 10), {
            includeInactive: true,
            includeDeletedMessages: true,
        });

        const conversationsArray = await Promise.all(
            conversations.map(conversation => ConversationResponse.instance(conversation, requestUser, ['chat-partner'], true)),
        );
        const messageCounts = await models.Message.getUserStatistics(requestUser.webuser_id);
        res.json(serializeConversations(conversationsArray, { meta: messageCounts }));
    }

    async listMessages(req: Request, res: Response) {
        const models = getModels(req.brandCode);
        const [requestUser, chatPartner] = await Promise.all([
            models.User.byId(parseInt(req.params.userId, 10), { includeInactive: true, includeDeleted: true }),
            models.User.byId(parseInt(req.params.partnerId, 10), { includeInactive: true, includeDeleted: true }),
        ]);
        if (!requestUser) {
            return notFoundError({ res, title: 'User not found' });
        }
        if (!chatPartner) {
            return notFoundError({ res, title: 'Conversation not found' });
        }

        const messages = await models.Message.getMessages(
            requestUser.webuser_id,
            chatPartner.webuser_id,
            requestUser.isParent ? { 'hide-messages-with-type': MessageType.instantJob } : {},
            { includeDeletedMessages: true },
        );
        const serializedReturn = await serializeMessages(messages, req, requestUser);
        res.json(serializedReturn);
    }
}
