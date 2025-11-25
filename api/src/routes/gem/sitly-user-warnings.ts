import { SitlyRouter } from '../sitly-router';
import { Request, Response } from 'express';
import { BaseRoute } from '../route';
import { serializeUser } from './sitly-user.serializer';
import { sanitizeIncludeUsers, sanitizeSitlyUserWarningListSearch } from './sitly-user-sanitization';
import { GemSitlyUserSearchDB } from '../../search/sitly-users-search';
import { BrandCode } from '../../models/brand-code';
import { ParsedQs } from 'qs';
import { ElasticService } from '../../services/elastic.service';
import { optionalAwait } from '../../utils/util';
import { forbiddenError } from '../../services/errors';
import { CommonEmailsService } from '../../services/email/common-emails.service';
import { UserWarningLevel } from '../../types';
import { UserWarningType } from '../../models/user-warning.model';
import { getModels } from '../../sequelize-connections';
import { User, WebRoleName } from '../../models/user/user.model';
import { PhotoService } from '../../services/photo.service';

export type GemSitlyUserSearchType = UserWarningLevel | 'suspected';

export class GemSitlyUserWarningsRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.get('/gem/sitly-users/warned', (req, res) => {
            if (req.query['meta-only']) {
                return new GemSitlyUserWarningsRoute().countUsersWithWarnings(req, res);
            } else {
                return new GemSitlyUserWarningsRoute().listUsersWithWarnings(req, res);
            }
        });

        router.get('/gem/sitly-users/warned/:searchType', (req, res) => {
            return new GemSitlyUserWarningsRoute().listUsersWithWarnings(req, res);
        });

        router.post('/gem/sitly-users/warned', (req, res) => {
            return new GemSitlyUserWarningsRoute().dispatchWarningActions(req, res);
        });
    }

    async countUsersWithWarnings(req: Request, res: Response) {
        sanitizeIncludeUsers(req);
        if (await this.handleValidationResult(req, res)) {
            return;
        }

        const userSearchDB = new GemSitlyUserSearchDB(req.brandCode);
        const counts = await userSearchDB.getUsersWithWarningsCounts({
            includeUsers: (req.query.filter as ParsedQs)?.includeUsers as string[],
        });

        res.json({
            meta: counts,
        });
    }

    async listUsersWithWarnings(req: Request, res: Response) {
        sanitizeSitlyUserWarningListSearch(req);
        if (await this.handleValidationResult(req, res)) {
            return;
        }

        const searchType = req.params.searchType as GemSitlyUserSearchType;
        let suspected = false;
        let warningLevel;
        if (searchType === 'suspected') {
            suspected = true;
        } else {
            warningLevel = searchType;
        }

        const userSearchDB = new GemSitlyUserSearchDB(req.brandCode);
        const page = req.query.page as ParsedQs;
        const filter = req.query.filter as ParsedQs;
        const users = await userSearchDB.getUsersWithWarnings({
            suspected,
            warningLevel,
            includeUsers: filter?.includeUsers as string[],
            warningType: filter?.warningType as UserWarningType,
            role: filter?.role as WebRoleName,
            limit: page?.limit ? +page.limit : undefined,
            createdBefore: page?.['created-before'] as string,
        });
        const response = await serializeUser(users);
        res.json(response);
    }

    async dispatchWarningActions(req: Request, res: Response) {
        const warningActions = ['ignore', 'quarantine', 'delete-avatar', 'delete-photos', 'delete-underaged'];

        req.checkBody('action')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'action is required',
            })
            .isIn(warningActions)
            .withMessage({
                code: 'INVALID_VALUE',
                title: `Invalid action, must be one of ${warningActions}`,
            });

        const idsField = req.body.action === 'delete-photos' ? 'photoIds' : 'ids';
        req.checkBody(idsField)
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: `${idsField} is required`,
            })
            .isArray()
            .withMessage({
                code: 'INVALID_VALUE',
                title: `${idsField} must be an array`,
            });
        if (await this.handleValidationResult(req, res)) {
            return;
        }

        try {
            const elasticService = ElasticService.getSearchInstance(req.brandCode);
            let users: User[];

            const models = getModels(req.brandCode);
            if (req.body.action === 'delete-photos') {
                const photos = await models.Photo.findAll({
                    where: { instance_id: req.body.photoIds as number[] },
                });
                users = await models.User.findAll({
                    where: { webuser_id: photos.map(item => item.webuser_id) },
                    include: 'customUser',
                });

                const photosByUserId = photos.reduce(
                    (acc, photo) => {
                        if (!acc[photo.webuser_id]) {
                            acc[photo.webuser_id] = [];
                        }
                        acc[photo.webuser_id].push(photo);
                        return acc;
                    },
                    {} as Record<number, typeof photos>,
                );

                await CommonEmailsService.sendChangeAvatar(users);

                await Promise.all(users.map(user => PhotoService.deleteUserPhotos(user, photosByUserId[user.webuser_id])));
            } else {
                const ids = req.body.ids as number[];
                users = await models.User.byIds(ids);

                if (req.body.action === 'ignore') {
                    await this.ignoreUserWarnings(req.brandCode, ids);
                } else if (req.body.action === 'quarantine') {
                    await this.quarantineUsers(req.brandCode, ids);
                } else if (req.body.action === 'delete-avatar') {
                    await this.deleteAvatars(req.brandCode, users);
                } else if (req.body.action === 'delete-underaged') {
                    if (users.some(user => user.isParent)) {
                        return forbiddenError({ res, title: 'Only fosters can be deleted' });
                    }

                    await Promise.all([
                        ...users.map(user => CommonEmailsService.sendDeleteUnderagedEmail(user)),
                        optionalAwait(
                            elasticService.deleteUsers(
                                users.map(user => user.webuser_id),
                                true,
                            ),
                        ),
                    ]);
                    await Promise.all(users.map(user => user.destroy()));
                    return res.status(204).json();
                }
            }

            await optionalAwait(
                elasticService.syncUsers(
                    req.brandCode,
                    users.map(user => user.webuser_id),
                    true,
                ),
            );

            res.status(204).json();
        } catch (e) {
            this.serverError(req, res, <Error>e);
        }
    }

    private async ignoreUserWarnings(brandCode: BrandCode, userIds: number[]) {
        const models = getModels(brandCode);
        await Promise.all([
            models.CustomUser.updateMultiple(userIds, {
                inappropriate: 0,
                quarantined_at: null,
                suspected: 0,
            }),
            models.Message.resendBlockedMessages(userIds),
            models.UserWarning.updateWarningLevel(userIds, UserWarningLevel.ignored),
        ]);
    }

    private async quarantineUsers(brandCode: BrandCode, userIds: number[]) {
        const models = getModels(brandCode);
        await Promise.all([
            models.CustomUser.updateMultiple(userIds, {
                inappropriate: 1,
                quarantined_at: new Date(),
            }),
            models.Message.blockAllMessages(userIds),
            models.UserWarning.updateWarningLevel(userIds, UserWarningLevel.blocked),
        ]);
    }

    private async deleteAvatars(brandCode: BrandCode, users: User[]) {
        const userIds = users.map(user => user.webuser_id);
        await Promise.all(users.map(user => PhotoService.deleteUserAvatar(user)));

        const models = getModels(brandCode);
        return Promise.all([
            models.CustomUser.updateMultiple(userIds, {
                avatar: null,
            }),
            models.UserWarning.updateWarningLevel(userIds, UserWarningLevel.ignored, UserWarningType.avatar),
            CommonEmailsService.sendChangeAvatar(users),
        ]);
    }
}
