import { SitlyRouter } from '../sitly-router';
import { Request, Response } from 'express';
import { BaseRoute } from '../route';
import { serializeUser } from './sitly-user.serializer';
import { getUserUpdateSanitizationResults, sanitizeSitlyUserSearch } from './sitly-user-sanitization';
import { GemSitlyUserSearchDB } from '../../search/sitly-users-search';
import { Error as JSONAPIError, Serializer as JSONAPISerializer } from 'jsonapi-serializer';
import { UserCustomSetters } from '../users/user-custom-setters';
import { optionalAwait } from '../../utils/util';
import { LogService } from '../../services/log.service';
import { SitlyToken } from '../../sitly-token';
import { duplicateEmailError, forbiddenError, notFoundError, unprocessableEntityError } from '../../services/errors';
import { MatchNotificationService } from '../../services/match-notification.service';
import { MatchesEmailsService } from '../../services/email/matches-emails.service';
import { ElasticService } from '../../services/elastic.service';
import { UserCreationType } from '../users/users-create';
import { UsersSearchRoute } from '../users/users-search';
import { sanitizeUserCreate } from '../users/user-create-sanitization';
import { CommonEmailsService } from '../../services/email/common-emails.service';
import { userNotificationMatchGroupDefaultInclude } from '../../models/matches/user-match-group.model';
import { SESTemplateName } from '../../services/email/email.service';
import { getModels } from '../../sequelize-connections';
import { User, WebRoleName, roleNameToRoleId } from '../../models/user/user.model';
import { PhotoService } from '../../services/photo.service';
import { LinksService } from '../../services/links.service';
import { format } from 'date-fns';
import { StringUtil } from '../../utils/string-util';
import { CleanUsersService } from '../../services/user-clean.service';

const tempTokenSerializer = new JSONAPISerializer('tempToken', {
    attributes: ['token'],
    keyForAttribute: 'camelCase',
});

export class GemSitlyUsersRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.get('/gem/sitly-users', (req, res) => {
            return new GemSitlyUsersRoute().list(req, res);
        });
        router.get('/gem/sitly-users/:id', (req, res) => {
            return new GemSitlyUsersRoute().byId(req, res);
        });
        router.get('/gem/sitly-users/:id/logs', (req, res) => {
            return new GemSitlyUsersRoute().getLogs(req, res);
        });
        router.get('/gem/sitly-users/:userId/matches', (req, res) => {
            return new UsersSearchRoute().search(req, res);
        });
        router.post('/gem/sitly-users', (req, res) => {
            return new GemSitlyUsersRoute().create(req, res);
        });
        router.patch('/gem/sitly-users/:id', (req, res) => {
            return new GemSitlyUsersRoute().update(req, res);
        });

        router.post('/gem/sitly-users/:id/notes', (req, res) => {
            return new GemSitlyUsersRoute().createNote(req, res);
        });
        router.post('/gem/sitly-users/:id/temp-tokens', (req, res) => {
            return new GemSitlyUsersRoute().createTempToken(req, res);
        });
        router.post('/gem/sitly-users/:id/warning-email', (req, res) => {
            return new GemSitlyUsersRoute().sendWarningEmail(req, res);
        });
        router.post('/gem/sitly-users/:id/email', (req, res) => {
            return new GemSitlyUsersRoute().sendEmail(req, res);
        });

        router.delete('/gem/sitly-users/:id', (req, res) => {
            return new GemSitlyUsersRoute().delete(req, res);
        });
        router.delete('/gem/sitly-users/:userId/photos/:photoId', (req, res) => {
            return new GemSitlyUsersRoute().deletePhoto(req, res);
        });
    }

    async list(req: Request, res: Response) {
        sanitizeSitlyUserSearch(req);
        if (await this.handleValidationResult(req, res)) {
            return;
        }

        const userSearchDB = new GemSitlyUserSearchDB(req.brandCode);
        const users = await userSearchDB.getUsers(req.query.filter as never);
        const response = await serializeUser(users);
        res.json(response);
    }

    async byId(req: Request, res: Response) {
        const { id } = req.params;
        req.checkParams('id').isInt().withMessage({
            code: 'INVALID_FORMAT',
            title: 'id should be integer',
        });
        if (await this.handleValidationResult(req, res)) {
            return;
        }

        const models = getModels(req.brandCode);
        const sitlyUser = await models.User.byIdForGem(parseInt(id, 10));
        if (!sitlyUser) {
            return notFoundError({ res, title: 'Sitly User not found' });
        }

        const conversationsCount = await models.ConversationWrapperOld.getConversationsCount(sitlyUser.webuser_id);
        const response = await serializeUser(sitlyUser, { conversationsCount });
        res.json(response);
    }

    async getLogs(req: Request, res: Response) {
        const { id } = req.params;
        req.checkParams('id').isInt().withMessage({
            code: 'INVALID_FORMAT',
            title: 'id should be integer',
        });
        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }

        const logs = await LogService.logsForUser(parseInt(id, 10), req.brandCode);
        res.status(200).json({
            data: logs.hits?.hits?.map(item => item._source) ?? [],
            meta: { total: logs.hits?.total.value ?? 0 },
        });
    }

    async create(req: Request, res: Response) {
        const models = getModels(req.brandCode);
        sanitizeUserCreate(req, UserCreationType.general);

        if (req.body.email && (await models.User.emailExists(req.body.email as string))) {
            return duplicateEmailError(res);
        }

        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }

        const now = new Date();
        const sitlyUser = await models.User.create({
            first_name: req.body.firstName as string,
            last_name: req.body.lastName as string,
            email: req.body.email as string,
            created: now,
            last_login: now,
            webrole_id: req.body.role ? roleNameToRoleId(req.body.role as WebRoleName) : null,
            ...User.passwordFields(req.body.password as string),
        });
        await sitlyUser.reload({ include: 'customUser' });
        res.status(201).json(await serializeUser(sitlyUser));
    }

    async update(req: Request, res: Response) {
        const { id } = req.params;
        const models = getModels(req.brandCode);
        const sitlyUser = await models.User.byId(
            parseInt(id, 10),
            {
                includeInactive: true,
                includeDeleted: true,
            },
            ['fosterProperties', 'parentSearchPreferences'],
        );
        if (!sitlyUser) {
            return notFoundError({ res, title: 'Sitly User not found' });
        }

        const errors = await getUserUpdateSanitizationResults(req, sitlyUser, BaseRoute.errorMapper);
        if (errors.length) {
            res.status(422);
            res.json(JSONAPIError(errors));
            return void 0;
        }

        if (req.body.email && (await models.User.emailExists(req.body.email as string))) {
            return duplicateEmailError(res);
        }

        const customSetters = new UserCustomSetters();
        const saveData = JSON.parse(JSON.stringify(req.body)) as Record<string, string>;
        const userAttrs = Object.keys(sitlyUser.dataValues);
        const customUserAttrs = Object.keys(sitlyUser.customUser.dataValues);
        const logs: { label: string; message: string }[] = [];
        Object.keys(saveData).forEach(field => {
            let updatedField = true;
            if (customSetters[field as keyof UserCustomSetters]) {
                customSetters[field as keyof UserCustomSetters](sitlyUser, saveData[field] as never);
            } else if (userAttrs.indexOf(StringUtil.snakeCase(field)) >= 0) {
                sitlyUser.set(StringUtil.snakeCase(field) as never, saveData[field] as never);
            } else if (customUserAttrs.indexOf(StringUtil.snakeCase(field)) >= 0) {
                sitlyUser.customUser.set(StringUtil.snakeCase(field) as never, saveData[field] as never);
            } else {
                updatedField = false;
            }
            if (updatedField) {
                logs.push({
                    label: `gemUser-user.update.${field}`,
                    message: typeof saveData[field] === 'string' ? saveData[field] : JSON.stringify(saveData[field]),
                });
            }
        });
        await optionalAwait(
            Promise.all(
                logs.map(log =>
                    LogService.log({
                        brandCode: req.brandCode,
                        label: log.label,
                        message: log.message,
                        user: sitlyUser,
                        refresh: true,
                    }),
                ),
            ),
        );

        try {
            await sitlyUser.save();
            await sitlyUser.customUser.save();
            if (sitlyUser.customUser.fosterProperties) {
                await sitlyUser.customUser.fosterProperties.save();
            }
            if (sitlyUser.customUser.parentSearchPreferences) {
                await sitlyUser.customUser.parentSearchPreferences.save();
            }

            const elasticService = ElasticService.getSearchInstance(req.brandCode);
            await optionalAwait(elasticService.syncUsers(req.brandCode, [sitlyUser.webuser_id], true));

            res.json(await serializeUser(sitlyUser));
        } catch (e) {
            this.serverError(req, res, e as Error);
        }
    }

    async delete(req: Request, res: Response) {
        const { id } = req.params;

        const sitlyUser = await getModels(req.brandCode).User.byId(parseInt(id, 10));
        if (!sitlyUser) {
            return notFoundError({ res, title: 'Sitly User not found' });
        }

        await CleanUsersService.softDelete(sitlyUser);

        ElasticService.getSearchInstance(req.brandCode).deleteUsers([sitlyUser.webuser_id]);
        LogService.log({ brandCode: req.brandCode, label: 'sitlyUser.delete', user: sitlyUser });

        res.status(204).json();
    }

    private async createNote(req: Request, res: Response) {
        req.sanitizeBody('content').trim();
        req.checkBody('content').notEmpty().withMessage({
            code: 'REQUIRED',
            title: 'content is required',
        });
        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }

        const { id } = req.params;
        const sitlyUser = await getModels(req.brandCode).User.byIdForGem(parseInt(id, 10));
        if (!sitlyUser) {
            return notFoundError({ res, title: 'Sitly User not found' });
        }

        const notes = sitlyUser.customUser.notes ?? '';
        const prepend = `${format(new Date(), 'dd-MM-yyyy')} - ${req.gemUser?.first_name} ${req.gemUser?.last_name}`;
        const newNote = `${prepend}\n${req.body.content}`;
        await sitlyUser.customUser.update({
            notes: `${notes}\n\n${newNote}`.trim(),
        });
        res.json(await serializeUser(sitlyUser));
    }

    async createTempToken(req: Request, res: Response) {
        const { id } = req.params;
        const sitlyUser = await getModels(req.brandCode).User.byId(parseInt(id, 10));
        if (!sitlyUser) {
            notFoundError({ res, title: 'Sitly User not found' });
            return void 0;
        }
        res.status(201);
        res.json(
            tempTokenSerializer.serialize({
                id: 'temp-token',
                token: SitlyToken.tempToken(sitlyUser, 'extraShort'),
            }),
        );
    }

    async sendWarningEmail(req: Request, res: Response) {
        const { id } = req.params;
        const sitlyUser = await getModels(req.brandCode).User.byId(parseInt(id, 10));
        if (!sitlyUser) {
            return notFoundError({ res, title: 'Sitly User not found' });
        }

        CommonEmailsService.sendPersonalDataWarning(sitlyUser);

        res.status(204).json();
    }

    async sendEmail(req: Request, res: Response) {
        const { id } = req.params;
        const sitlyUser = await getModels(req.brandCode).User.byId(parseInt(id, 10));
        const email = sitlyUser?.email;
        if (!sitlyUser || !email) {
            return notFoundError({ res, title: 'Sitly User not found or has no email' });
        }

        const emailType = req.body.emailType as SESTemplateName;
        const supportedTypes: SESTemplateName[] = [
            'change-avatar',
            'complete-registration-reminder',
            'forgot-password',
            'login-link',
            'non-response-victim',
            'matchmail',
            'payment-cancellation',
            'personal-data-warning',
            'reactivation',
            'underaged',
        ];
        if (!supportedTypes.includes(emailType)) {
            return unprocessableEntityError({
                res,
                title: `${emailType} is not supported`,
            });
        }
        if (emailType !== 'personal-data-warning' && !email.endsWith('@sitly.com')) {
            return forbiddenError({ res, title: 'This is allowed only for @sitly.com users' });
        }

        switch (emailType) {
            case 'change-avatar': {
                await CommonEmailsService.sendChangeAvatar([sitlyUser]);
                return res.status(204).json();
            }
            case 'complete-registration-reminder': {
                await CommonEmailsService.sendCompleteRegistrationReminder([sitlyUser]);
                return res.status(204).json();
            }
            case 'forgot-password': {
                const token = SitlyToken.resetPasswordToken(email);
                await CommonEmailsService.sendForgotPassword(sitlyUser, LinksService.resetPasswordUrl(req.brandCode, token));
                return res.status(204).json();
            }
            case 'login-link': {
                await CommonEmailsService.sendLoginLink(sitlyUser, LinksService.loginUrl(sitlyUser));
                return res.status(204).json();
            }
            case 'matchmail': {
                const group = await MatchNotificationService.calculateMatchesForUser(sitlyUser);
                if (!group) {
                    return notFoundError({ res, title: 'No matches found' });
                }
                await group.reload({ include: userNotificationMatchGroupDefaultInclude });
                await MatchesEmailsService.sendMatchMail([group]);
                return res.status(204).json();
            }
            case 'non-response-victim': {
                if (sitlyUser.isParent) {
                    return res.status(403).json();
                }
                await CommonEmailsService.sendNonResponseVictim([sitlyUser]);
                return res.status(204).json();
            }
            case 'payment-cancellation': {
                await CommonEmailsService.sendPaymentCancellation(sitlyUser);
                return res.status(204).json();
            }
            case 'personal-data-warning': {
                await CommonEmailsService.sendPersonalDataWarning(sitlyUser);
                return res.status(204).json();
            }
            case 'reactivation': {
                await CommonEmailsService.sendReactivationEmail([sitlyUser]);
                return res.status(204).json();
            }
            case 'underaged': {
                await CommonEmailsService.sendDeleteUnderagedEmail(sitlyUser);
                return res.status(204).json();
            }
            default:
                return res.status(403).json();
        }
    }

    async deletePhoto(req: Request, res: Response) {
        const { userId, photoId } = req.params;

        const [sitlyUser, photo] = await Promise.all([
            getModels(req.brandCode).User.byId(parseInt(userId, 10)),
            getModels(req.brandCode).Photo.byId(photoId),
        ]);

        if (!sitlyUser) {
            return notFoundError({ res, title: 'Sitly User not found' });
        }

        if (!photo) {
            return notFoundError({ res, title: 'Photo not found' });
        }

        if (photo.webuser_id !== sitlyUser.webuser_id) {
            return notFoundError({ res, title: 'Photo not found for requested user' });
        }
        await PhotoService.deleteUserPhotos(sitlyUser, [photo]);
        res.status(204).json();
    }
}
