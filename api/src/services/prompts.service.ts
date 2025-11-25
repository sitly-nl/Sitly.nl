import { PaymentType } from './../models/payment-types';
import { CheckAppVersionService } from './app-version.service';
import { DateUtil } from '../utils/date-util';
import { Util } from '../utils/util';
import { AvatarOverlayType } from '../models/user/custom-user.model';
import { config } from '../../config/config';
import { differenceInMilliseconds, isAfter, isBefore, sub } from 'date-fns';
import { User } from '../models/user/user.model';
import { Prompt } from '../models/prompt.model';
import { IncomingHttpHeaders } from 'http';

export enum PromptType {
    avatarReminder = 'avatarReminder',
    fillNewProperties = 'fillNewProperties',
    recurringPaymentFailed = 'recurringPaymentFailed',
    availabilityReminder = 'availabilityReminder',
    noAvailabilityReminder = 'noAvailabilityReminder',
    negativeReview = 'negativeReview',
    positiveReview = 'positiveReview',
    positiveReviewEkomi = 'positiveReviewEkomi',
    positiveReviewTrustpilot = 'positiveReviewTrustpilot',
    positiveReviewGoogle = 'positiveReviewGoogle',
    firstRecommendation = 'firstRecommendation',
    newApplication = 'newApplication',
    avatarOverlay = 'avatarOverlay',
}

interface SearchPromptInput {
    user: User;
    headers: IncomingHttpHeaders;
}

export class PromptsService {
    private static appVersionsService = new CheckAppVersionService();

    async nextPrompt(input: SearchPromptInput) {
        let promptTypeToShow: PromptType | undefined;
        await input.user.customUser.reload({ include: ['prompts', 'fosterProperties'] });
        const prompts = input.user.customUser.prompts ?? [];

        // check major app version update
        const appsUpdates = await PromptsService.appVersionsService.hasUpdate(input.headers);
        if (appsUpdates.hasMajorUpdate) {
            promptTypeToShow = PromptType.newApplication;
        }

        // next prompt by priority (if avatar is still validating we have to wait)
        if (!promptTypeToShow && input.user.customUser.avatar_overlay !== AvatarOverlayType.processing) {
            const promptTypes = this.prioritizedPromptTypes(input.user);
            for (const type of promptTypes) {
                let selectedPromptType: PromptType | undefined;
                if (type === 'positiveReview') {
                    selectedPromptType = await this.calculatePositiverReviewPromptType(input.user, input.headers);
                } else {
                    const shouldShow = await this.shouldShowPrompt(type, input.user, appsUpdates.hasUpdate, input.headers);
                    selectedPromptType = shouldShow ? type : undefined;
                }
                if (selectedPromptType) {
                    // unique per lifetime
                    const promptsWithSameType = prompts.filter(prompt => prompt.prompt_type === type);
                    const isBlocking = Prompt.isBlocking(selectedPromptType);
                    if (promptsWithSameType.length < (isBlocking ? 3 : 6)) {
                        promptTypeToShow = selectedPromptType;
                        break;
                    }
                }
            }
        }

        // time validation
        if (promptTypeToShow && !this.passedTimeValidation(prompts, input.user, promptTypeToShow)) {
            promptTypeToShow = undefined;
        }

        return promptTypeToShow ? this.createPrompt(input, promptTypeToShow) : undefined;
    }

    private createPrompt(input: SearchPromptInput, promptType: PromptType) {
        let delay;
        switch (promptType) {
            case PromptType.positiveReviewTrustpilot:
            case PromptType.positiveReviewGoogle:
            case PromptType.positiveReview:
            case PromptType.negativeReview:
                delay = undefined;
                break;
            case PromptType.noAvailabilityReminder:
                if (input.user.isFirstSession) {
                    delay = 20;
                } else {
                    delay = 0;
                }
                break;
            case PromptType.firstRecommendation:
                delay = 120;
                break;
            default:
                delay = 20;
        }
        return input.user.sequelize.models.Prompt.create({
            prompt_type: promptType,
            created_at: new Date(),
            webuser_id: input.user.webuser_id,
            show_delay: delay,
        });
    }

    private prioritizedPromptTypes(user: User): (PromptType | 'positiveReview')[] {
        if (user.isParent) {
            return [
                PromptType.fillNewProperties,
                PromptType.recurringPaymentFailed,
                PromptType.noAvailabilityReminder,
                PromptType.availabilityReminder,
                PromptType.newApplication,
                // PromptType.avatarReminder,
                'positiveReview',
            ];
        } else {
            return [
                PromptType.fillNewProperties,
                PromptType.recurringPaymentFailed,
                PromptType.avatarOverlay,
                'positiveReview',
                PromptType.negativeReview,
                PromptType.noAvailabilityReminder,
                PromptType.firstRecommendation,
                PromptType.avatarReminder,
                PromptType.availabilityReminder,
                PromptType.newApplication,
            ];
        }
    }

    private async shouldShowPrompt(type: PromptType, user: User, hasAppUpdate: boolean, headers: IncomingHttpHeaders) {
        switch (type) {
            case PromptType.avatarReminder:
                return user.customUser.avatar_url === null && isBefore(user.created ?? new Date(), sub(new Date(), { days: 3 }));
            case PromptType.fillNewProperties: {
                if (Util.isApp(headers)) {
                    return false;
                }
                const prompts = user.customUser.prompts ?? [];
                if (prompts.some(prompt => prompt.prompt_type === type)) {
                    return false;
                }
                // check release dates of appropriate features in WR
                if (user.isParent) {
                    return user.created && isBefore(user.created, new Date('2021-02-16T16:00:00Z'));
                } else {
                    return (
                        user.created &&
                        isBefore(user.created, new Date('2021-01-14T12:00:00Z')) &&
                        !user.customUser.fosterProperties?.traits
                    );
                }
            }
            case PromptType.recurringPaymentFailed: {
                const payment = await user.customUser.lastPayment();
                if (payment?.paid === 0 && payment?.order_type === PaymentType.recurring && payment?.user_notified === 0) {
                    let show = true;
                    if (
                        payment.refusal_reason?.startsWith('Not enough balance') ||
                        payment.refusal_reason?.startsWith('Insufficient funds')
                    ) {
                        show = isBefore(payment.created, sub(new Date(), { days: 31 }));
                    }
                    if (show) {
                        await payment.update({ user_notified: 1 });
                    }
                    return show;
                }
                return false;
            }
            case PromptType.avatarOverlay:
                return user.customUser.avatar_overlay === AvatarOverlayType.socialFilter;
            case PromptType.availabilityReminder:
                return (
                    !user.customUser.availability_updated || isBefore(user.customUser.availability_updated, sub(new Date(), { weeks: 3 }))
                );
            case PromptType.noAvailabilityReminder: {
                const prefix = user.isParent ? 'pref_' : 'foster_';

                const hasDayAvailability = DateUtil.weekDays.some(weekDay => {
                    const dayValue = user.customUser[`${prefix}${weekDay}`];
                    return dayValue?.match(/[1-3]/);
                });
                const occasional = !!user.customUser[`${prefix}occasional`];
                const regular = !!user.customUser[`${prefix}regular`];
                const afterSchool = !!user.customUser[`${prefix}after_school`];
                return !hasDayAvailability && !occasional && !regular && !afterSchool;
            }
            case PromptType.negativeReview: {
                if (Util.isWeb(headers)) {
                    return false;
                }

                if (user.customUser?.negative_feedback_accepted !== null) {
                    return false;
                }

                const conversationsCount = await user.sequelize.models.ConversationWrapperOld.getConversationsCount(user.webuser_id);
                return user.isFirstSession && !user.isPremium && conversationsCount === 0;
            }
            case PromptType.firstRecommendation:
                if (user.isParent) {
                    return false;
                } else {
                    const prompts = user.customUser.prompts ?? [];
                    if (prompts.some(prompt => prompt.prompt_type === PromptType.firstRecommendation)) {
                        return false;
                    }
                    await user.customUser.reload({ include: 'recommendations' });
                    return user.customUser.recommendations?.length === 0;
                }
            case PromptType.newApplication:
                return hasAppUpdate;
        }
    }

    private async calculatePositiverReviewPromptType(user: User, headers: IncomingHttpHeaders) {
        if (user.customUser.positive_feedback_accepted !== null) {
            return undefined;
        }

        let promptType: PromptType | undefined;
        if (Util.isWeb(headers)) {
            // calculate specific type only for web
            if (user.customUser?.ekomi_rated) {
                return undefined;
            }
            const brandConfigSettings = config.getConfig(user.brandCode);
            const { CoreSetting } = user.sequelize.models;
            const [maxEkomi, ekomiCount, trustpilotCount, googleCount] = await Promise.all([
                CoreSetting.maxNumberOfEkomiOrders(),
                CoreSetting.numberOfEkomiOrders(),
                CoreSetting.numberOfTrustPilotOrders(),
                CoreSetting.numberOfGoogleReviewOrders(),
            ]);
            const ekomiAvailable = brandConfigSettings.ekomiAuth && ekomiCount < maxEkomi;
            const googleAvailable = brandConfigSettings.googleReviewUrl;
            const totalReviews = (ekomiAvailable ? ekomiCount : 0) + (googleAvailable ? googleCount : 0) + trustpilotCount;
            if (ekomiAvailable && (totalReviews === 0 || ekomiCount / totalReviews < 0.3)) {
                promptType = PromptType.positiveReviewEkomi;
            } else if (
                googleAvailable &&
                (totalReviews === 0 || googleCount / totalReviews < (ekomiAvailable ? 0.2 : 0.3)) &&
                user.email?.endsWith('@gmail.com')
            ) {
                promptType = PromptType.positiveReviewGoogle;
            } else if (brandConfigSettings.trustPilotBusinessUnitId) {
                promptType = PromptType.positiveReviewTrustpilot;
            }
        } else {
            promptType = PromptType.positiveReview;
        }

        const conversationsCountInLastSession = await user.sequelize.models.ConversationWrapperOld.getConversationsCount(
            user.webuser_id,
            user.customUser?.session_start_time ?? undefined,
        );
        return conversationsCountInLastSession > 0 ? promptType : undefined;
    }

    private passedTimeValidation(prompts: Prompt[], user: User, promptTypeToShow: PromptType) {
        const isBlocking = Prompt.isBlocking(promptTypeToShow);

        // session
        const promptsInSession = prompts.filter(
            prompt => !user.customUser.session_start_time || isAfter(prompt.created_at, user.customUser.session_start_time),
        );
        if (
            promptTypeToShow === PromptType.noAvailabilityReminder &&
            !promptsInSession.some(prompt => prompt.prompt_type === PromptType.noAvailabilityReminder)
        ) {
            // No availability prompt has only one time validation - not more then 1 per session
            return true;
        }
        const hasSameBlockingType = promptsInSession.some(prompt => prompt.isBlocking() === isBlocking);
        const exclusionForAvatarOverlay = !isBlocking && (prompts.length === 0 || prompts.at(-1)?.prompt_type === PromptType.avatarOverlay);
        if (hasSameBlockingType && !exclusionForAvatarOverlay) {
            return false;
        }

        // day
        const promptsInDay = prompts.filter(prompt => differenceInMilliseconds(prompt.created_at, sub(new Date(), { days: 1 })) >= 0);
        const blockingPromptsInDay = promptsInDay.filter(prompt => prompt.isBlocking());
        if (isBlocking) {
            if (blockingPromptsInDay.length > 0) {
                return false;
            }
        } else if (promptsInDay.length - blockingPromptsInDay.length > 1) {
            return false;
        }

        // week
        const promptsInWeek = prompts.filter(prompt => differenceInMilliseconds(prompt.created_at, sub(new Date(), { weeks: 1 })) >= 0);
        const blockingPromptsInWeek = promptsInWeek.filter(prompt => prompt.isBlocking());
        if (isBlocking) {
            if (blockingPromptsInWeek.length > 1) {
                return false;
            }
        } else if (promptsInWeek.length - blockingPromptsInWeek.length > 2) {
            return false;
        }

        // unique per week
        if (promptsInWeek.some(prompt => prompt.prompt_type === promptTypeToShow)) {
            return false;
        }

        return true;
    }
}
