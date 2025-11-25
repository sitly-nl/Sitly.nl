import { SitlyRouter } from './sitly-router';
import { Response } from 'express';
import { BaseRoute } from './route';
import { Error as JSONAPIError } from 'jsonapi-serializer';
import { optionalAwait } from '../utils/util';
import { UserWarningService } from '../services/user-warning.service';
import { UserWarningLevel } from '../types';
import { UserWarningType } from '../models/user-warning.model';
import { getModels } from '../sequelize-connections';
import { UserRequest } from '../services/auth.service';

export class ReportsRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.post<UserRequest>('/reports', (req, res) => {
            return new ReportsRoute().create(req, res);
        });
    }

    async create(req: UserRequest, res: Response) {
        req.checkBody('reportedUserId').notEmpty().withMessage({
            code: 'REQUIRED',
            title: 'reportedWebuserId is required',
        });

        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }

        const models = getModels(req.brandCode);
        const reportedUser = await models.User.byUserUrl(req.body.reportedUserId as string, {}, ['warnings']);
        if (!reportedUser) {
            res.status(422);
            const error = JSONAPIError({
                code: 'INVALID_VALUE',
                title: 'Reported user not found',
                source: {
                    parameter: 'reportedUserId',
                },
            });
            res.json(error);
            return void 0;
        }

        let message;
        if (req.body.reportedMessageId) {
            message = await models.Message.byId(req.body.reportedMessageId as number);
        }

        if (req.body.type === UserWarningType.avatar) {
            await optionalAwait(
                (async () => {
                    const avatarWarning = reportedUser.customUser.warnings?.find(
                        warning => warning.warning_type === UserWarningType.avatar,
                    );
                    if (avatarWarning) {
                        await Promise.all([
                            reportedUser.customUser.update({
                                inappropriate: 1,
                            }),
                            avatarWarning.update({
                                warning_level: UserWarningLevel.severe,
                                warning_phrases: avatarWarning.warning_phrases + ' (reported by user)',
                            }),
                        ]);
                    }
                })(),
            );
        } else {
            await optionalAwait(UserWarningService.processReport(reportedUser, req.user, req.body.reason as string, message ?? undefined));
        }

        res.status(204).json();
    }
}
