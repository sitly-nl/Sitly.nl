import { AvatarValidatorGoogle } from './../../services/avatar-validation/avatar-validation-GoogleVision.service';
import { CityStatisticsRoute } from './users-city-statistics';
import { AvatarValidator } from '../../services/avatar-validation/avatar-validation.service';
import { LogService } from '../../services/log.service';
import { SitlyRouter } from './../sitly-router';
import { Request, Response } from 'express';
import { BaseRoute } from '../route';
import { Serializer as JSONAPISerializer } from 'jsonapi-serializer';
import { UserSearchElastic } from '../../search/user-search-elastic';
import { config } from '../../../config/config';
import { PromptsService } from '../../services/prompts.service';
import { AvatarValidatorGoogleAutoML } from '../../services/avatar-validation/avatar-validation-GoogleAutoML.service';
import { serializeUser } from './user.serializer';
import { optionalAwait, Util } from '../../utils/util';
import { StringUtil } from '../../utils/string-util';
import { includeError, notFoundError, unauthorized } from '../../services/errors';
import { readFileSync } from 'fs';
import { CommonEmailsService } from '../../services/email/common-emails.service';
import { getModels } from '../../sequelize-connections';
import { CustomUser, CustomUserRelations } from '../../models/user/custom-user.model';
import { Op } from 'sequelize';
import { serializePrompt } from '../../models/serialize/prompt-response';
import { UserRequest } from '../../services/auth.service';
import { WebRoleId } from '../../models/user/user.model';
import { TranslationsService } from '../../services/translations.service';
import { FeaturesService } from '../../services/features/features.service';
import { serializeUserUpdates } from '../../models/serialize/user-updates-response';
import { format } from 'date-fns';
import { CleanUsersService } from '../../services/user-clean.service';

const nonResponseVictimHtml = readFileSync('./src/views/emails/sub-templates/non-response-victim-body.html', 'utf8');
const googleClientIdMaxLength = 32;
const googleClientIdPattern = /^\d+\.\d+$/;
const sanitizeGetHeaders = (req: UserRequest) => {
    req.checkHeaders('sitly-user-ga-client-id')
        .callback((clientId?: string) => {
            if (!clientId) {
                return true;
            }
            if (clientId.length > googleClientIdMaxLength || !googleClientIdPattern.test(clientId)) {
                return false;
            }
            return true;
        })
        .withMessage({
            code: 'INVALID_FORMAT',
            title: 'sitly-user-ga-client-id should be a valid client id up to 32 chars',
        });
};

export class UsersRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.get<UserRequest>('/users/latest-registrations', (req, res) => {
            return new UsersRoute().list(req, res);
        });
        router.get<UserRequest>('/users/me/about-suggestion', (req, res) => {
            return new UsersRoute().aboutSuggestion(req, res);
        });
        router.get<UserRequest>('/users/me/hourly-rates-statistic', (req, res) => {
            return new CityStatisticsRoute().cityHourlyRatesStatistics(req, res);
        });
        router.get('/users/city-statistics', (req, res) => {
            return new CityStatisticsRoute().cityStatistics(req, res);
        });
        router.get<UserRequest>('/users/:userUrl', (req, res) => {
            return new UsersRoute().index(req, res);
        });
        router.get<UserRequest>('/users/me/updates', (req, res) => {
            if (req.query.version === 'new') {
                return new UsersRoute().updates(req, res);
            } else {
                return new UsersRoute().updatesAndPromptsOld(req, res);
            }
        });
        router.get<UserRequest>('/users/me/non-response-victim-html', (req, res) => {
            return new UsersRoute().nonResponseVictimHtml(req, res);
        });
        router.delete<UserRequest>('/users/me', (req, res) => {
            return new UsersRoute().delete(req, res);
        });
        router.post('/users/testAvatarValidation', (req, res) => {
            return new UsersRoute().testAvatarValidation(req, res);
        });
    }

    async list(req: UserRequest, res: Response) {
        const includes = this.getIncludes(req, this.userPublicAllowedIncludes);
        const users = await getModels(req.brandCode).User.findAll({
            limit: 10,
            order: [['created', 'DESC']],
            include: {
                association: 'customUser',
                where: {
                    address: {
                        [Op.not]: null,
                    },
                },
                include: CustomUser.includes(includes),
            },
        });
        res.json(await serializeUser({ data: users, contextUser: req.user, localeCode: req.locale, includes }));
    }

    async aboutSuggestion(req: UserRequest, res: Response) {
        let suggestion = '';

        const translator = await TranslationsService.translator({ localeId: req.localeId, groupName: 'about-texts' });
        const getAboutTextsTranslation = (code: string) => {
            let aboutSuggestion = translator.translated(code);

            const brandConfigSettings = config.getConfig(req.brandCode);
            const translationReplacements = brandConfigSettings?.translationReplacements?.[req.locale];
            if (translationReplacements) {
                for (const key in translationReplacements) {
                    if (translationReplacements[key]) {
                        const regex = new RegExp(key, 'g');
                        aboutSuggestion = aboutSuggestion?.replace(regex, translationReplacements[key]);
                    }
                }
            }
            return aboutSuggestion;
        };

        if (req.user.isParent) {
            suggestion += getAboutTextsTranslation('name')?.replace('[first_name]', req.user.first_name ?? '');
            await req.user.customUser.reload({ include: 'children' });

            const children = req.user.customUser.children ?? [];
            let boysCount = 0;
            let girlsCount = 0;
            let expectedChildData;
            const ages: number[] = [];
            for (const child of children) {
                if (child.isExpected) {
                    expectedChildData = {
                        month: Intl.DateTimeFormat(req.locale.replace('_', '-'), { month: 'long' }).format(child.birthdate),
                        year: format(child.birthdate, 'yyyy'),
                    };
                } else {
                    child.gender === 'f' ? girlsCount++ : boysCount++;
                    ages.push(child.age);
                }
            }
            ages.sort((a, b) => a - b);
            const childrenCount = boysCount + girlsCount;

            if (expectedChildData && childrenCount === 0) {
                suggestion += ` ${translator.translated(
                    'childExpecting',
                    { '[month]': expectedChildData.month, '[year]': expectedChildData.year },
                    false,
                )}`;
            } else {
                suggestion += ` ${
                    childrenCount === 1
                        ? translator.translated('oneChild')
                        : translator.translated('multipleChildren', { '[count]': `${childrenCount}` }, false)
                }`;

                const and = translator.translated('and');
                const genderLines: string[] = [];
                if (boysCount > 0) {
                    genderLines.push(`${boysCount} ${translator.translated(boysCount > 1 ? 'boys' : 'boy')}`);
                }
                if (girlsCount > 0) {
                    genderLines.push(`${girlsCount} ${translator.translated(girlsCount > 1 ? 'girls' : 'girl')}`);
                }
                suggestion += ` (${genderLines.join(` ${and} `)}, ${
                    ages.length === 1 && ages[0] === 1
                        ? translator.translated('oneYearOld')
                        : translator.translated('yearsOld', {
                              years: Util.aggregatedDescription(ages, ` ${and} `),
                          })
                })${
                    expectedChildData
                        ? translator.translated(
                              'childExpecting.and',
                              { '[month]': expectedChildData.month, '[year]': expectedChildData.year },
                              false,
                          )
                        : '.'
                }`;
            }

            let lookingFor = '';
            if (req.user.customUser?.pref_babysitter) {
                lookingFor += 'B';
            }
            if (req.user.customUser?.pref_childminder) {
                lookingFor += 'C';
            }

            if (lookingFor) {
                suggestion += ` ${getAboutTextsTranslation(`lookingFor${lookingFor}`)} `;
            }

            suggestion += ` ${getAboutTextsTranslation('contactParent')}`;
        } else {
            suggestion += getAboutTextsTranslation('nameAndAge')
                ?.replace('[first_name]', req.user.first_name ?? '')
                .replace('[age]', `${req.user.age}`);

            if (req.user.customUser?.foster_references) {
                suggestion += ` ${getAboutTextsTranslation('references')}`;
            }

            if (req.user.webrole_id === WebRoleId.babysitter) {
                const extra = ['foster_driving', 'foster_shopping', 'foster_cooking', 'foster_homework', 'foster_chores'] as const;
                let hasExtra = false;
                let additionalServices = getAboutTextsTranslation('additionalServices');

                for (const service of extra) {
                    if (req.user.customUser[service]) {
                        hasExtra = true;

                        additionalServices += ` ${getAboutTextsTranslation(StringUtil.camelCase(service))},`;
                    }
                }
                if (hasExtra) {
                    additionalServices = additionalServices.replace(/,$/, '') + '.';
                    suggestion += ` ${additionalServices}`;
                }

                suggestion += ` ${getAboutTextsTranslation('contactBabysit')}`;
            } else {
                suggestion += ` ${getAboutTextsTranslation('childminderLocation')}`;
                if (req.user.customUser?.foster_visit) {
                    suggestion += ` ${translator.translated('childminder.locationVisit')?.toLowerCase()}`;

                    if (req.user.customUser?.foster_receive) {
                        suggestion += ` ${translator.translated('or')} ${translator
                            .translated('childminder.locationReceive')
                            ?.toLowerCase()}`;
                    }
                } else if (req.user.customUser?.foster_receive) {
                    suggestion += ` ${translator.translated('childminder.locationReceive')?.toLowerCase()}`;
                }

                suggestion += '.';
                suggestion += ` ${getAboutTextsTranslation('contactChildminder')}`;
            }
        }
        res.json(suggestion);
    }

    async index(req: UserRequest, res: Response) {
        const userUrl: string = req.params.userUrl;
        let param;
        const models = getModels(req.brandCode);

        let possibleIncludes: (keyof CustomUserRelations)[];
        let includeIncomplete = false;
        let includeDisabled = false;
        let includeDeleted = false;
        let includeInappropriate = false;
        let includeInactive = false;
        let includeInvisible = false;

        if (userUrl === 'me') {
            if (req.query.waitForPremium) {
                const models = req.user.sequelize.models;
                let user = await models.User.byId(req.user.webuser_id);
                const attemptsCount = 20;
                for (let index = 0; index < attemptsCount && !user?.isPremium; index++) {
                    await Util.wait(index >= 10 ? 3_000 : 700);
                    user = await models.User.byId(req.user.webuser_id);
                }
            }

            if (req.user) {
                possibleIncludes = this.userPrivateAllowedIncludes;
                param = req.user.customUser?.webuser_url;
                includeIncomplete = true;
                includeInappropriate = true;
                includeInvisible = true;

                sanitizeGetHeaders(req);
                if (await this.handleValidationResult(req, res)) {
                    return void 0;
                }
                if (typeof req.headers['sitly-user-ga-client-id'] === 'string') {
                    await models.ExternalServices.upsert({
                        ga_client_id: req.headers['sitly-user-ga-client-id'],
                        webuser_id: req.user.webuser_id,
                    });
                }
            } else {
                return unauthorized({ res });
            }
        } else {
            possibleIncludes = this.userPublicAllowedIncludes;
            param = userUrl;
        }

        if (req.query['include-inactive'] === '1') {
            includeDisabled = true;
            includeDeleted = true;
            includeInappropriate = true;
            includeInactive = true;
            includeInvisible = true;
        }

        // includes
        const possibleSimilarUsersIncludes = [
            'similar-users',
            'similar-users.children',
            'similar-users.recommendations',
            'similar-users.place',
        ];
        const customUserIncludes: (keyof CustomUserRelations)[] = [];
        const similarUserIncludes: string[] = [];
        const reqIncludes = req.query.include ? (req.query.include as string).split(',') : [];
        reqIncludes.forEach(item => {
            if (item.startsWith('similar-users')) {
                similarUserIncludes.push(item);
            } else {
                customUserIncludes.push(item as keyof CustomUserRelations);
            }
        });
        for (const item of customUserIncludes) {
            if (!possibleIncludes.includes(item)) {
                return includeError(res, new Error(`${item} cannot be included`));
            }
        }
        for (const item of similarUserIncludes) {
            if (!possibleSimilarUsersIncludes.includes(item)) {
                return includeError(res, new Error(`${item} cannot be included`));
            }
        }

        const profileUser = await models.User.byUserUrl(
            param,
            {
                includeIncomplete,
                includeDisabled,
                includeDeleted,
                includeInappropriate,
                includeInactive,
                includeInvisible,
            },
            [
                ...customUserIncludes,
                ...(['locale', 'place', 'fosterProperties', 'parentSearchPreferences', 'warnings', 'photos'] as const).filter(
                    item => !customUserIncludes.includes(item),
                ),
            ],
        );
        if (!profileUser || (await req.user?.hasBlockForUser(profileUser.webuser_id))) {
            return notFoundError({ res, title: 'User not found' });
        }

        if (req.user && req.user.webuser_id !== profileUser.webuser_id) {
            await optionalAwait(
                Promise.all([
                    req.user.updateLastSearchActivity(req),
                    profileUser.customUser.update({
                        profile_view_count: (profileUser.customUser.profile_view_count ?? 0) + 1,
                    }),
                    models.ViewedProfiles.upsert(
                        {
                            viewer_id: req.user.webuser_id,
                            viewed_webuser_id: profileUser.webuser_id,
                            viewed_at: format(new Date(), 'yyyy-MM-dd HH:mm:ss') as never,
                        },
                        { fields: ['viewed_at'] },
                    ),
                ]),
            );
        }

        const serializedUser = await serializeUser({
            data: profileUser,
            contextUser: req.user,
            localeCode: req.locale,
            includes: customUserIncludes,
            customSetter: async (user, userResponse) => {
                if (similarUserIncludes.length > 0) {
                    const similarIncludes = similarUserIncludes
                        .filter(include => include.startsWith('similar-users.'))
                        .map(include => include.replace('similar-users.', ''));
                    try {
                        const userSearch = new UserSearchElastic(req.brandCode, req.localeId);
                        const similarUserCollection = await userSearch.getSimilar(user, {
                            include: similarIncludes as (keyof CustomUserRelations)[],
                            ...(req.user ? {} : { privateOnly: 0 }),
                        });
                        await userResponse.fillSimilar(similarUserCollection.models, {
                            place: similarUserIncludes.includes('similar-users.place'),
                        });
                    } catch {
                        userResponse.similar = [];
                    }
                }
            },
        });
        res.json(serializedUser);
    }

    async updates(req: UserRequest, res: Response) {
        const models = getModels(req.brandCode);
        const [totalUnreadMessagesCount, unviewedInvitesCount, jobPosting, prompt] = await Promise.all([
            models.Message.getTotalUnreadMessagesCount(req.user.webuser_id),
            FeaturesService.connectionInvitesEnabled(req.brandCode)
                ? models.ConnectionInvite.unviewedInvitesCount(req.user.webuser_id)
                : undefined,
            FeaturesService.jobPostingEnabled ? models.JobPosting.byUserId(req.user.webuser_id) : undefined,
            new PromptsService().nextPrompt({ user: req.user, headers: req.headers }),
        ]);

        if (prompt) {
            LogService.logRequest({ req, label: 'prompt.sent', message: prompt.prompt_type });
        }

        res.status(200).json(
            serializeUserUpdates({
                totalUnreadMessagesCount,
                unviewedInvitesCount: unviewedInvitesCount ?? 0,
                isPremium: req.user.isPremium,
                jobPosting: jobPosting?.toJSON(),
                prompt,
            }),
        );
    }

    async updatesAndPromptsOld(req: UserRequest, res: Response) {
        const unreadMessagePromise = getModels(req.brandCode)
            .Message.getTotalUnreadMessagesCount(req.user.webuser_id)
            .then(totalUnreadMessagesCount => {
                const serializer = new JSONAPISerializer('total-unread-messages-count', {
                    attributes: ['totalUnreadMessagesCount'],
                    keyForAttribute: 'camelCase',
                });
                return serializer.serialize({ totalUnreadMessagesCount });
            });

        const promptPromise = new PromptsService().nextPrompt({ user: req.user, headers: req.headers }).then(prompt => {
            if (prompt) {
                LogService.logRequest({ req, label: 'prompt.sent', message: prompt.prompt_type });
                return serializePrompt(prompt);
            }
        });

        const responseObject = (await Promise.all([unreadMessagePromise, promptPromise])).filter(item => item);

        res.status(200);
        res.json(responseObject);
    }

    async nonResponseVictimHtml(req: UserRequest, res: Response) {
        let html = nonResponseVictimHtml;
        html = html.substring(html.indexOf('<!-- title -->'));
        const params = await CommonEmailsService.nonResponseVictimEmailParams(req.user, true);
        Object.entries(params).forEach(([key, value]) => {
            if (typeof value === 'string') {
                html = html.replace(`{{${key}}}`, value);
            }
        });
        html = html.replace(/color:#ef335f/g, 'color:#b9439b');
        html = html.replace(/target="_blank"/g, '');
        res.send(html);
    }

    async delete(req: UserRequest, res: Response) {
        const isTestUser = req.user.email && Util.isTestingEmail(req.user.email);
        if (isTestUser) {
            await req.user.destroy();
            return res.status(204).json();
        }

        await CleanUsersService.softDelete(req.user);

        LogService.logRequest({ req, label: 'user.delete' });

        res.status(204).json();
    }

    async testAvatarValidation(req: Request, res: Response) {
        const savedData = JSON.parse(JSON.stringify(req.body)) as Record<string, string>;
        const avatar = savedData.avatar;
        const type = savedData.type;
        if (avatar) {
            if (type === 'Azure') {
                res.statusCode = 200;
                res.json();
            } else if (type === 'Google') {
                const service = new AvatarValidator();
                try {
                    const validationResponse = await service.validate(avatar);
                    console.log('validationResponse_Google', validationResponse);
                    res.statusCode = 200;
                    res.json(validationResponse);
                } catch (error) {
                    res.statusCode = 400;
                    res.json(error);
                }
            } else if (type === 'Google_ML') {
                const service = new AvatarValidatorGoogleAutoML();
                try {
                    const validationResponse = await service.validate(avatar);
                    console.log('validationResponse', validationResponse);
                    res.statusCode = 200;
                    res.json(validationResponse);
                } catch (error) {
                    res.statusCode = 400;
                    res.json(error);
                }
            } else if (type === 'Nudity') {
                const service = new AvatarValidatorGoogle();
                try {
                    const validationResponse = await service.nudityValidation(avatar);
                    console.log('validationResponse_Nudity', validationResponse);
                    res.statusCode = 200;
                    res.json(validationResponse);
                } catch (error) {
                    res.statusCode = 400;
                    res.json(error);
                }
            } else {
                res.statusCode = 400;
                res.json();
            }
        } else {
            res.statusCode = 400;
            res.json();
        }
    }
}
