import { config } from './../../config/config';
import { MessageType } from '../models/message.types';
import { UserSearchElastic } from '../search/user-search-elastic';
import { Error as JSONAPIError } from 'jsonapi-serializer';
import { SitlyRouter } from './sitly-router';
import { NextFunction, Request, Response } from 'express';
import { BaseRoute } from './route';
import { PushNotificationService } from '../services/push-notification.service';
import { sanitizeSearch } from '../search/search-sanitization';
import { forbiddenError } from '../services/errors';
import { UsersSearchRoute, UserSearchParamsInput } from './users/users-search';
import { serializeMessages } from './messages/messages.serializer';
import { JobPosting, JobPostingState } from '../models/job-posting.model';
import { getModels } from '../sequelize-connections';
import { UserRequest } from '../services/auth.service';
import { TranslationsService } from '../services/translations.service';
import { StringUtil } from '../utils/string-util';
import { utcToZonedTime } from 'date-fns-tz';
import { differenceInSeconds, format, getHours, parseISO, startOfDay, sub } from 'date-fns';
import { serializeJobPosting } from '../models/serialize/job-posting-response';

export class JobPostingRoute extends BaseRoute {
    batchSize = 10;
    maxBatchCount = 2;

    static create(router: SitlyRouter) {
        router.get('/job-postings/:id', (req, res, next) => {
            return new JobPostingRoute().index(req, res, next);
        });

        router.post<UserRequest>('/job-postings', (req, res) => {
            return new JobPostingRoute().create(req, res);
        });

        router.post<UserRequest>('/job-postings/invitations', (req, res, next) => {
            return new JobPostingRoute().sendInvitations(req, res, next);
        });

        router.post('/job-postings/:id/complete', (req, res, next) => {
            return new JobPostingRoute().complete(req, res, next);
        });

        router.post('/job-postings/:id/continue', (req, res, next) => {
            return new JobPostingRoute().continue(req, res, next);
        });

        router.post<UserRequest>('/job-postings/:id/available', (req, res, next) => {
            return new JobPostingRoute().markAvailable(req, res, next);
        });

        router.post<UserRequest>('/job-postings/:id/remove-invitation/:chatPartnerUrl', (req, res, next) => {
            return new JobPostingRoute().removeUserInvitation(req, res, next);
        });

        router.post<UserRequest>('/job-postings/:id/reject/:chatPartnerUrl', (req, res, next) => {
            return new JobPostingRoute().rejectFoster(req, res, next);
        });
    }

    async index(req: Request, res: Response, next: NextFunction) {
        const jobPosting = await getModels(req.brandCode).JobPosting.byId(parseInt(req.params.id, 10));
        if (!jobPosting) {
            res.status(404);
            res.json(
                JSONAPIError({
                    code: 'NOT_FOUND',
                    title: 'job posting not found',
                }),
            );
            return;
        }

        res.status(200);
        res.json(await serializeJobPosting(jobPosting));
    }

    private sanitize(req: UserRequest) {
        req.checkBody('startAt')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'start at is required',
            })
            .isISO8601()
            .withMessage({
                code: 'INVALID_FORMAT',
                title: 'Start date must be in iso 8601 format',
            })
            .callback((value: string) => {
                const valueDate = new Date(value);
                const now = startOfDay(new Date());
                return (
                    differenceInSeconds(sub(valueDate, { hours: 24 }), now) >= 0 &&
                    differenceInSeconds(sub(valueDate, { months: 6 }), now) <= 0
                );
            })
            .withMessage({
                code: 'INVALID_VALUE',
                title: 'Start date must be in range 24 hours - 6 months from now',
            });

        const filterValidator = req.checkBody('filter');
        filterValidator.notEmpty().withMessage({
            code: 'REQUIRED',
            title: 'filter are required',
        });

        sanitizeSearch(req, req.user);
    }

    async create(req: UserRequest, res: Response) {
        if (await req.user.jobPostingDisabledTill()) {
            return forbiddenError({ res, title: 'reached max job posting count per 30 days' });
        }

        this.sanitize(req);
        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }

        const searchFilters = req.body.filter as Record<string, unknown>;
        searchFilters.limit = this.batchSize;
        searchFilters.sort = 'relevance';

        const jobPosting = await getModels(req.brandCode).JobPosting.create({
            start_at: new Date(req.body.startAt as string),
            webuser_id: req.user.webuser_id,
            filter: JSON.stringify(searchFilters),
            created_at: new Date(),
        });

        await this.postMessagesIfAllowed(req, jobPosting);
        await jobPosting.reload();

        res.status(201);
        res.json(await serializeJobPosting(jobPosting));
    }

    async sendInvitations(req: UserRequest, res: Response, next: NextFunction) {
        const initialJobPostings = await getModels(req.brandCode).JobPosting.initial();
        for (const jobPosting of initialJobPostings) {
            if ((await jobPosting.repliesCount()) >= 2) {
                await jobPosting.update({ state: JobPostingState.finished });
            } else if (jobPosting.handle_start_time_exceed === null && differenceInSeconds(new Date(), jobPosting.start_at) > 0) {
                await jobPosting.update({ handle_start_time_exceed: 1 });
                await PushNotificationService.sendToUsers([
                    {
                        notification: {
                            data: {
                                type: 'job_posting_start_time_exceed',
                                jobPostingId: jobPosting.instance_id,
                            },
                        },
                        user: req.user,
                    },
                ]);
            }
        }

        const jobPostings = await getModels(req.brandCode).JobPosting.active();
        await Promise.all(
            jobPostings.map(async element => {
                if (element.batch_count === this.maxBatchCount) {
                    return element.update({ state: JobPostingState.finished });
                } else {
                    return this.postMessagesIfAllowed(req, element);
                }
            }),
        );

        res.json();
    }

    private async postMessagesIfAllowed(req: UserRequest, jobPosting: JobPosting) {
        const brandConfigSettings = config.getConfig(req.brandCode);
        const serverTime = req.body.serverTime ? parseISO(req.body.serverTime as string) : new Date();
        const zonedTime = utcToZonedTime(serverTime, brandConfigSettings.timeZone);
        const currentHour = getHours(zonedTime);

        const allowed = currentHour >= 7 && currentHour <= 22;
        if (allowed) {
            const models = getModels(req.brandCode);
            const user = await models.User.byId(jobPosting.webuser_id);
            const center =
                user?.customUser?.map_latitude && user?.customUser?.map_longitude
                    ? {
                          latitude: user.customUser.map_latitude,
                          longitude: user.customUser.map_longitude,
                      }
                    : undefined;
            const userSearch = new UserSearchElastic(req.brandCode, req.localeId, center);

            jobPosting.last_sent_at = new Date();
            jobPosting.batch_count = (jobPosting.batch_count ?? 0) + 1;
            await jobPosting.save();

            const alreadyNotified = await models.JobPostingUser.notified(jobPosting.instance_id);

            const searchFilters = JSON.parse(jobPosting.filter) as UserSearchParamsInput;
            searchFilters.exclude = alreadyNotified.map(item => item.foster_id);
            const userCollection = await userSearch.users(UsersSearchRoute.inputToSearchParams(searchFilters));

            await models.JobPostingUser.bulkCreate(
                userCollection.models.map(user => {
                    return {
                        parent_id: req.user.webuser_id,
                        foster_id: user.webuser_id,
                        job_posting_id: jobPosting.instance_id,
                        sent_at: new Date(),
                        batch_number: jobPosting.batch_count,
                    };
                }),
            );
        }
    }

    async complete(req: Request, res: Response, next: NextFunction) {
        const jobPosting = await getModels(req.brandCode).JobPosting.byId(parseInt(req.params.id, 10));
        if (!jobPosting) {
            res.status(404);
            res.json(
                JSONAPIError({
                    code: 'NOT_FOUND',
                    title: 'job posting not found',
                }),
            );
            return;
        }

        await jobPosting.update({
            state: (await jobPosting.repliesCount()) >= 2 ? JobPostingState.completedSuccessfully : JobPostingState.completedUnsuccessfully,
        });

        res.status(204).json();
    }

    async continue(req: Request, res: Response, next: NextFunction) {
        const jobPosting = await getModels(req.brandCode).JobPosting.byId(parseInt(req.params.id, 10));
        if (!jobPosting) {
            res.status(404);
            res.json(
                JSONAPIError({
                    code: 'NOT_FOUND',
                    title: 'job posting not found',
                }),
            );
            return;
        }

        await jobPosting.update({ handle_start_time_exceed: 0 });

        res.status(204);
        res.json();
    }

    async markAvailable(req: UserRequest, res: Response, next: NextFunction) {
        if (req.user.isParent) {
            return forbiddenError({ res, title: 'Only foster can accept job posting' });
        }

        const jobPosting = await getModels(req.brandCode).JobPosting.byId(parseInt(req.params.id, 10));
        if (!jobPosting) {
            res.status(404);
            res.json(
                JSONAPIError({
                    code: 'NOT_FOUND',
                    title: 'job posting not found',
                }),
            );
            return;
        }

        const translator = await TranslationsService.translator({ localeId: req.localeId, groupName: 'job-posting' });

        const messageContent =
            req.user.first_name +
            ' ' +
            translator.translated('available.for') +
            ' ' +
            StringUtil.capitalizeFirstLetter(await this.description(jobPosting, req)) +
            '\n' +
            translator.translated('start.conversation');

        const message = await getModels(req.brandCode).Message.create({
            sender_id: req.user.webuser_id,
            sender_name: req.user.first_name,
            receiver_id: jobPosting.webuser_id,
            subject: '',
            content: messageContent,
            created: new Date(),
            message_type: MessageType.jobPostingReply,
            job_posting_id: jobPosting.instance_id,
        });
        await message.reload({ include: 'jobPosting' });
        res.json(await serializeMessages(message, req, req.user));
    }

    async removeUserInvitation(req: UserRequest, res: Response, next: NextFunction) {
        if (!req.user.isParent) {
            return forbiddenError({ res, title: 'Only parent can remove invitation' });
        }

        const models = getModels(req.brandCode);
        const foster = await models.User.byUserUrl(req.params.chatPartnerUrl, {
            includeDeleted: true,
            includeDisabled: true,
        });
        if (!foster) {
            res.status(404);
            res.json(
                JSONAPIError({
                    code: 'NOT_FOUND',
                    title: 'Foster not found',
                }),
            );
            return void 0;
        }

        const jobPostingUser = await models.JobPostingUser.byFosterIdForJobPosting(foster.webuser_id, parseInt(req.params.id, 10));
        if (!jobPostingUser) {
            res.status(404);
            res.json(
                JSONAPIError({
                    code: 'NOT_FOUND',
                    title: 'No invitation to remove',
                }),
            );
            return;
        }

        await jobPostingUser.destroy();

        res.status(200);
        res.json();
    }

    async rejectFoster(req: UserRequest, res: Response, next: NextFunction) {
        if (!req.user.isParent) {
            return forbiddenError({ res, title: 'Only parent can reject job posting' });
        }

        const chatPartner = await getModels(req.brandCode).User.byUserUrl(req.params.chatPartnerUrl, {
            includeDeleted: true,
            includeDisabled: true,
        });
        if (!chatPartner) {
            res.status(404);
            res.json(
                JSONAPIError({
                    code: 'NOT_FOUND',
                    title: 'Conversation not found',
                }),
            );
            return void 0;
        }

        const translator = await TranslationsService.translator({ localeId: req.localeId, groupName: 'job-posting' });

        let messageContent = translator.translated('rejections.message');
        messageContent = messageContent.replace(/\[parent-name\]/g, req.user.first_name ?? '');
        messageContent = messageContent.replace('[him/her]', translator.translated(req.user.customUser?.gender === 'f' ? 'her' : 'him'));

        const message = await getModels(req.brandCode).Message.create({
            sender_id: req.user.webuser_id,
            sender_name: req.user.first_name,
            receiver_id: chatPartner.webuser_id,
            subject: '',
            content: messageContent,
            created: new Date(),
            message_type: MessageType.jobPostingRejection,
            job_posting_id: +req.params.id,
        });
        await message.reload({ include: 'jobPosting' });
        res.json(await serializeMessages(message, req, req.user));
    }

    private async description(jobPosting: JobPosting, req: Request) {
        const form = JSON.parse(jobPosting.filter) as UserSearchParamsInput['filter'];

        const joinReducer = (acc: string, value: string, index: number, array: string[]) => {
            if (index === array.length - 1) {
                return acc + value;
            } else if (index === array.length - 2) {
                return acc + value + ' & ';
            } else {
                return acc + value + ', ';
            }
        };
        const translator = await TranslationsService.translator({ localeId: req.localeId, groupName: 'job-posting' });

        let description = '';
        if (form.isAvailableOccasionally) {
            description += translator.translated('occasional.babysitter');
        } else {
            if (form.availability) {
                description += translator.translated('childcare.during.day') + ' ';
                description += Object.entries(form.availability)
                    .map(([key, value]) => {
                        if (value && Object.keys(value).length === 0) {
                            return null;
                        } else {
                            return translator.translated(`main.${key}Short`);
                        }
                    })
                    .filter(item => item !== null)
                    .reduce(joinReducer, '');
            }
            if (form.isAvailableAfterSchool && form.afterSchoolDays) {
                if (description.length > 0) {
                    description += ', ';
                }
                description += translator.translated('afterschool.care.on') + ' ';
                description += form.afterSchoolDays.map(item => translator.translated(`main.${item}Short`)).reduce(joinReducer, '');
            }
        }
        description += ', ' + translator.translated('starting.on') + ' ' + format(jobPosting.start_at, 'd MMMM');
        return description;
    }
}
