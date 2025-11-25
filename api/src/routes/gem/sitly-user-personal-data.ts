import { SitlyRouter } from '../sitly-router';
import { Request, Response } from 'express';
import { ParsedQs } from 'qs';
import { BrandCode } from '../../models/brand-code';
import { GemSitlyUserSearchDB } from '../../search/sitly-users-search';
import { AnalyzerReplacements, TextAnalyzerService } from '../../services/text-analyzer.service';
import { BaseRoute } from '../route';
import { sanitizeIncludeUsers } from './sitly-user-sanitization';
import { serializeUser } from './sitly-user.serializer';
import { CommonEmailsService } from '../../services/email/common-emails.service';
import { config } from '../../../config/config';
import { getModels } from '../../sequelize-connections';
import { TranslationsService } from '../../services/translations.service';

export class GemSitlyUserPersonalDataRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.get('/gem/sitly-users/flagged-personal-data', (req, res) => {
            return new GemSitlyUserPersonalDataRoute().listUsersWithPersonalData(req, res);
        });

        router.post('/gem/sitly-users/flagged-personal-data', (req, res) => {
            return new GemSitlyUserPersonalDataRoute().dispatchPersonalDataActions(req, res);
        });
    }

    async listUsersWithPersonalData(req: Request, res: Response) {
        sanitizeIncludeUsers(req);
        if (await this.handleValidationResult(req, res)) {
            return;
        }

        const userSearchDB = new GemSitlyUserSearchDB(req.brandCode);
        const where = {
            abuse: 1,
            userIds: (req.query.filter as ParsedQs)?.includeUsers as string[],
            blocked: false,
            personalDataNotIgnored: true,
            hidden: false,
            deleted: 0,
            completed: 1,
        } as const;

        if (req.query['meta-only']) {
            const count = await userSearchDB.getUsersCount(where);
            res.json({
                meta: { count },
            });
        } else {
            const users = await userSearchDB.getUsers(where);
            const brandConfigSettings = config.getConfig(req.brandCode);

            const writtenNumbers = await TranslationsService.singleTranslation({
                localeId: brandConfigSettings.defaultLocaleId,
                groupName: 'api',
                code: 'writtenNumbers',
            });
            const replacedAboutTexts = users.reduce((map, user) => {
                return map.set(
                    user.webuser_id,
                    TextAnalyzerService.replacePersonalData(user.customUser.about ?? '', writtenNumbers.split(',')),
                );
            }, new Map<number, AnalyzerReplacements>());

            const response = await serializeUser(users, { replacedAboutTexts });
            res.json(response);
        }
    }

    async dispatchPersonalDataActions(req: Request, res: Response) {
        const warningActions = ['ignore', 'replace-and-warn'];

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

        req.checkBody('ids')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'ids is required',
            })
            .isArray()
            .withMessage({
                code: 'INVALID_VALUE',
                title: 'ids must be an array',
            });

        if (req.body.action === 'replace-and-warn') {
            const requiredLength = (req.body.ids?.length as number) ?? 0;

            req.checkBody('changes')
                .isArray()
                .withMessage({
                    code: 'INVALID_VALUE',
                    title: 'changes must be an array',
                })
                .custom((value: unknown[]) => {
                    return value.length === requiredLength;
                })
                .withMessage({
                    code: 'INVALID_LENGTH',
                    title: 'changes must be the same length as ids',
                });
        }

        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }

        try {
            if (req.body.action === 'ignore') {
                await this.ignorePersonalData(req.brandCode, req.body.ids as number[]);
            } else if (req.body.action === 'replace-and-warn') {
                await this.replaceAndWarn(req.brandCode, req.body.ids as number[], req.body.changes as string[]);
            }
            res.status(204);
            res.json();
        } catch (e) {
            this.serverError(req, res, <Error>e);
        }
    }

    private async ignorePersonalData(brandCode: BrandCode, userIds: number[]) {
        return getModels(brandCode).CustomUser.updateMultiple(userIds, {
            abuse: 0,
        });
    }

    private async replaceAndWarn(brandCode: BrandCode, userIds: number[], changes: string[]) {
        const users = await getModels(brandCode).User.byIds(userIds);
        return Promise.all(
            users.map((user, i) => {
                return Promise.all([
                    CommonEmailsService.sendPersonalDataWarning(user),
                    user.customUser.update({
                        abuse: 0,
                        about: changes[i] ?? user.customUser.about,
                    }),
                ]);
            }),
        );
    }
}
