import { TextAnalyzerService } from './text-analyzer.service';
import { BrandCode } from '../models/brand-code';
import { AvatarValidatorGoogle } from './avatar-validation/avatar-validation-GoogleVision.service';
import { AvatarValidationType, AvatarValidator } from './avatar-validation/avatar-validation.service';
import { User } from '../models/user/user.model';
import { UserWarningLevel } from '../types';
import { MessagesCountStatistic } from '../models/message.types';
import { UserWarningType } from '../models/user-warning.model';
import { Payment } from '../models/payment.model';
import { Photo } from '../models/photo.model';
import { getModels } from '../sequelize-connections';
import { Message } from '../models/message.model';
import { Util } from '../utils/util';
import { add } from 'date-fns';

export type UserTextWarningType = UserWarningType.about | UserWarningType.firstName | UserWarningType.lastName | UserWarningType.email;

interface WarningResult {
    phrases: string;
    level: UserWarningLevel;
    content?: string;
}
export class UserWarningService {
    static async processMessage(user: User, message: Message) {
        const warnings = [];
        if (!user.customUser.quarantined_at) {
            const initialMessageCount = await user.sequelize.models.Message.getInitialMessageCountStatistic(user.webuser_id);

            const [contentWarningResult] = await Promise.all([
                this.validateContent(user.brandCode, message.content),
                this.validateRateLimit(user, initialMessageCount),
            ]);
            const countWarningResult = this.validateMessageCount(initialMessageCount);
            const maleWarningResult = this.validateMaleUserMessage(user, initialMessageCount);

            if (contentWarningResult) {
                warnings.push(await this.processWarning(UserWarningType.message, user, contentWarningResult, message));
            }
            if (countWarningResult) {
                warnings.push(await this.processWarning(UserWarningType.spam, user, countWarningResult, message));
            }
            if (maleWarningResult) {
                warnings.push(await this.processWarning(UserWarningType.male, user, maleWarningResult, message));
            }
        }

        if (user.customUser.inappropriate) {
            message.notified = 1;
            message.receiver_deleted = 1;
            message.blocked = 1;
        }

        let flagMessage = false;

        if (message.is_initial) {
            if (warnings.length) {
                flagMessage = true;
            } else {
                if (!user.customUser.warnings?.length) {
                    await user.customUser.reload({ include: 'warnings' });
                }
                flagMessage = user.customUser.warnings?.some(warning => warning.warning_level === UserWarningLevel.moderate) ?? false;
            }
        }

        if (flagMessage) {
            message.warning_level = UserWarningLevel.moderate;
        }

        message.active = 1;
        await message.save();
        return warnings;
    }

    static async processUserAttribute(user: User, warningType: UserTextWarningType) {
        let textToValidate = '';
        switch (warningType) {
            case UserWarningType.firstName:
                textToValidate = user.first_name ?? '';
                break;
            case UserWarningType.lastName:
                textToValidate = user.last_name ?? '';
                break;
            case UserWarningType.about:
                textToValidate = user.customUser.about ?? '';
                break;
            case UserWarningType.email:
                textToValidate = user.email ?? '';
                break;
        }
        const warningResult = await this.validateContent(user.brandCode, textToValidate);
        if (warningResult) {
            return this.processWarning(warningType, user, warningResult);
        }
    }

    static async processAvatar(user: User, avatar: string, photo?: Photo) {
        if (user.isParent) {
            let warningType: AvatarValidationType | undefined;
            if ((await new AvatarValidatorGoogle().nudityValidation(avatar)).detected) {
                warningType = AvatarValidationType.explicitContent;
            } else if (
                user.brandCode === BrandCode.malaysia &&
                (await new AvatarValidatorGoogle().textOverlayValidationMY(avatar)).detected
            ) {
                warningType = AvatarValidationType.textOverlay;
            }

            if (warningType) {
                await this.processWarning(
                    UserWarningType.avatar,
                    user,
                    {
                        phrases: warningType,
                        level: UserWarningLevel.moderate,
                    },
                    undefined,
                    photo,
                );
                return true;
            } else {
                if (!photo) {
                    await getModels(user.brandCode).UserWarning.destroy({
                        where: {
                            webuser_id: user.webuser_id,
                            warning_type: UserWarningType.avatar,
                            photo_id: null,
                        },
                    });
                }
                return false;
            }
        } else {
            const validationResponse = await new AvatarValidator().validate(avatar);
            if (validationResponse.mandatory.length > 0 || validationResponse.optional.length > 0) {
                await this.processWarning(
                    UserWarningType.avatar,
                    user,
                    {
                        phrases: [...validationResponse.mandatory, ...validationResponse.optional].join(','),
                        level: UserWarningLevel.moderate,
                    },
                    undefined,
                    photo,
                );
                return true;
            }
            return false;
        }
    }

    static async processReport(reportedUser: User, reporter: User, reason: string, message?: Message) {
        await this.processWarning(UserWarningType.report, reportedUser, {
            phrases: `${reason}${message ? `\n-----\n${message.content}` : ''}`,
            level: UserWarningLevel.moderate,
            content: `Reported by: ${reporter.email}`,
        });
    }

    private static validateMessageCount(initialMessageCount: MessagesCountStatistic) {
        const warningTimeGroupMessageCounts = {
            last_2_days: 50,
        };
        for (const timeGroup of Util.keysOf(warningTimeGroupMessageCounts)) {
            const messageCount = initialMessageCount[timeGroup as keyof MessagesCountStatistic].count;
            if (messageCount) {
                if (messageCount >= warningTimeGroupMessageCounts[timeGroup]) {
                    return {
                        phrases: messageCount.toString(),
                        content: `Max no. of ${warningTimeGroupMessageCounts[timeGroup]} messages exceeded in ${timeGroup.replace(
                            '_',
                            ' ',
                        )}`,
                        level: UserWarningLevel.moderate,
                    };
                }
            }
        }
    }

    private static validateMaleUserMessage(user: User, initialMessageCount: MessagesCountStatistic) {
        const age = user.age;
        if (user.customUser.gender !== 'm' || age < 18) {
            return undefined;
        }

        const messagesToday = initialMessageCount?.last_day.count ?? 0;

        if (messagesToday > 6) {
            return {
                phrases: '',
                content: `male, premium, ${age ? `${age} y/o` : ''}, ${messagesToday} sent messages in 24 hours`,
                level: UserWarningLevel.moderate,
            };
        }
    }

    private static async validateRateLimit(user: User, initialMessageCount: MessagesCountStatistic) {
        const rateLimitTimeGroupMessageCounts = Object.entries({
            last_hour: 30,
            last_day: 30,
            last_week: 100,
            last_month: 200,
        });

        const exceeded = rateLimitTimeGroupMessageCounts.find(([timeGroup, maxCount]) => {
            return initialMessageCount[timeGroup as keyof MessagesCountStatistic].count >= maxCount;
        });
        if (exceeded) {
            await user.customUser.update({ message_rate_limit_exceeded_at: new Date() });
        }

        const warning = rateLimitTimeGroupMessageCounts.find(([timeGroup, maxCount]) => {
            return initialMessageCount[timeGroup as keyof MessagesCountStatistic].count >= maxCount - 5;
        });
        if (warning) {
            const timeGroup = warning[0] as keyof MessagesCountStatistic;
            let expire = new Date(initialMessageCount[timeGroup].first_message_created * 1000);
            switch (timeGroup) {
                case 'last_hour':
                    expire = add(expire, { hours: 1 });
                    break;
                case 'last_day':
                    expire = add(expire, { days: 1 });
                    break;
                case 'last_2_days':
                    expire = add(expire, { days: 2 });
                    break;
                case 'last_week':
                    expire = add(expire, { weeks: 1 });
                    break;
                case 'last_month':
                    expire = add(expire, { months: 1 });
                    break;
                default:
                    return timeGroup satisfies never;
            }
            await user.customUser.update({
                message_rate_limit_warning_type: timeGroup,
                message_rate_limit_warning_expire_at: expire,
            });
        }
    }

    private static async validateContent(brandCode: BrandCode, content?: string) {
        const detectedPhrases = await TextAnalyzerService.sensitivePhrasesIn(content ?? '', brandCode);
        if (detectedPhrases.length > 0) {
            const warningPhrases = detectedPhrases.map(item => item.phrase).join(',');
            if (detectedPhrases.some(item => item.type === UserWarningLevel.severe)) {
                return {
                    phrases: warningPhrases,
                    level: UserWarningLevel.severe,
                    content,
                };
            } else if (detectedPhrases.some(item => item.type === UserWarningLevel.moderate)) {
                return {
                    phrases: warningPhrases,
                    level: UserWarningLevel.moderate,
                    content,
                };
            }
        }
    }

    static async processPayment(user: User, payment: Payment) {
        if (user.customUser.gender === 'm') {
            await this.processWarning(UserWarningType.male, user, {
                phrases: 'Male parent premium subscription',
                level: UserWarningLevel.moderate,
                content: `Premium acquired on ${payment.created.toISOString()}`,
            });
            return true;
        }
        return false;
    }

    private static async processWarning(type: UserWarningType, user: User, warningResult: WarningResult, message?: Message, photo?: Photo) {
        const models = getModels(user.brandCode);
        if (warningResult.level === UserWarningLevel.severe) {
            user.customUser.update({
                inappropriate: 1,
            });
        } else if (warningResult.level === UserWarningLevel.moderate) {
            models.Message.warnReceivers(user.webuser_id);
        }

        let warning;
        if (
            !photo &&
            [
                UserWarningType.spam,
                UserWarningType.avatar,
                UserWarningType.male,
                UserWarningType.about,
                UserWarningType.firstName,
                UserWarningType.lastName,
                UserWarningType.email,
            ].includes(type)
        ) {
            warning = await models.UserWarning.findOne({ where: { webuser_id: user.webuser_id, warning_type: type } });
        }

        if (!warning) {
            warning = models.UserWarning.build();
        }
        return warning.update({
            webuser_id: user.webuser_id,
            message_id: message?.instance_id,
            warning_level: warningResult.level,
            warning_type: type,
            warning_phrases: warningResult.phrases,
            warning_text: warningResult.content ?? null,
            photo_id: photo?.instance_id ?? null,
        });
    }
}
