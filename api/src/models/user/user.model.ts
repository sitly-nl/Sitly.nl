import {
    AfterCreate,
    BeforeDestroy,
    BeforeFind,
    BelongsToMany,
    Column,
    DataType,
    HasMany,
    HasOne,
    Sequelize,
    Table,
} from 'sequelize-typescript';
import { ColumnTimestamp, CountryBaseModel } from '../base.model';
import { Availability } from '../serialize/user-response';
import * as moment from 'moment';
import { DateUtil } from '../../utils/date-util';
import { Environment } from '../../services/env-settings.service';
import { Util, optionalAwait } from '../../utils/util';
import { CryptoUtil } from '../../utils/crypto-util';
import { CustomUser, CustomUserColumns, CustomUserRelations, MatchmailSetting } from './custom-user.model';
import { add, differenceInDays, differenceInYears, format, isAfter, isToday, sub } from 'date-fns';
import { UserExclusionType } from '../user-exclusion.model';
import { FindOptions, HasManyGetAssociationsMixin, IncludeOptions, Op, WhereOptions } from 'sequelize';
import { BrandCode } from '../brand-code';
import { SentryService } from '../../services/sentry.service';
import { Favorite } from '../favorite.model';
import { PaymentType } from '../payment-types';
import { Client } from '@elastic/elasticsearch';
import { NotificationSettings } from './notification-settings.model';
import { ConnectionInvite } from '../connection-invite.model';
import { config } from '../../../config/config';
import { UserRequest } from '../../services/auth.service';
import { LogService } from '../../services/log.service';
import { StringUtil } from '../../utils/string-util';

const client = new Client(Environment.apiKeys.elasticsearch_users);

export enum WebRoleId {
    parent = 1,
    babysitter = 2,
    childminder = 3,
}
export const allUserRoleIds = Object.values(WebRoleId).filter(item => typeof item !== 'string');

export enum WebRoleName {
    parent = 'parent',
    babysitter = 'babysitter',
    childminder = 'childminder',
}
export const allUserRoles = Object.values(WebRoleName);

export const roleNameToRoleId = (name: WebRoleName) => {
    switch (name) {
        case WebRoleName.parent:
            return WebRoleId.parent;
        case WebRoleName.babysitter:
            return WebRoleId.babysitter;
        case WebRoleName.childminder:
            return WebRoleId.childminder;
        default:
            return name satisfies never;
    }
};

interface UserRelations {
    favorites?: CustomUser[];
}

export class UserColumns extends CountryBaseModel<UserColumns, 'webuser_id', 'active'> {
    @Column({ primaryKey: true, autoIncrement: true }) webuser_id: number;
    @Column(DataType.INTEGER) webrole_id: WebRoleId | null;
    @Column(DataType.STRING) email: string | null;
    @Column(DataType.STRING) password: string | null;
    @Column(DataType.STRING) salt: string | null;
    @Column(DataType.STRING) first_name: string | null;
    @Column(DataType.STRING) last_name: string | null;
    @ColumnTimestamp last_login: Date | null;
    @ColumnTimestamp created: Date | null;
    @Column({ allowNull: false, defaultValue: 1 }) active: 0 | 1;
}

@Table({ tableName: 'cms_webusers' })
export class User extends UserColumns {
    @HasOne(() => CustomUser) customUser: CustomUser;
    @HasOne(() => NotificationSettings) notificationSettings?: NotificationSettings;
    @HasMany(() => ConnectionInvite, { foreignKey: 'receiver_id' }) receivedInvites?: ConnectionInvite[];
    @HasMany(() => ConnectionInvite, { foreignKey: 'sender_id' }) sentInvites?: ConnectionInvite[];
    @BelongsToMany(() => User, {
        through: () => Favorite,
        foreignKey: 'webuser_id',
        otherKey: 'favorite_id',
    })
    private favorites?: User[];
    declare getFavorites: HasManyGetAssociationsMixin<User>;
    declare static queryGenerator: { selectQuery: (a: unknown, b: unknown) => string }; // private api - use with care

    get isFirstSession() {
        return (
            this.created &&
            this.customUser?.session_start_time &&
            isAfter(add(this.created, { days: 1 }), this.customUser?.session_start_time)
        );
    }
    get isParent() {
        return this.webrole_id === WebRoleId.parent;
    }
    get isPremium() {
        const premiumExpiryDate = this.customUser?.premium;
        const gracePeriodExpiryDate = this.customUser?.grace_period;
        if (!premiumExpiryDate && !gracePeriodExpiryDate) {
            return false;
        }

        const premiumEndDate = moment().subtract(1, 'day');
        let isPremium = moment(premiumExpiryDate).diff(premiumEndDate.format('YYYY-MM-DD')) >= 0;
        if (!isPremium && gracePeriodExpiryDate) {
            const graceDiff = moment(gracePeriodExpiryDate).diff(premiumEndDate);
            isPremium = graceDiff >= 0;
        }

        return isPremium;
    }
    get availableForChat() {
        return !this.customUser?.disabled && !this.customUser?.deleted && !this.customUser?.inappropriate;
    }
    get rateLimitExceeded() {
        const exceededDate = this.customUser?.message_rate_limit_exceeded_at;
        return !!(exceededDate && isAfter(add(exceededDate, { days: 1 }), new Date()));
    }
    get rateLimitWarning() {
        const expireAt = this.customUser.message_rate_limit_warning_expire_at;
        return expireAt && isAfter(expireAt, new Date()) ? this.customUser.message_rate_limit_warning_type : undefined;
    }
    get availability() {
        const availability = {} as Availability;
        const prefix = this.isParent ? 'pref_' : 'foster_';
        for (const weekday of DateUtil.weekDays) {
            const prop = `${prefix}${weekday}` as const;
            availability[weekday] = {
                morning: this.customUser[prop]?.includes('1') ?? false,
                afternoon: this.customUser[prop]?.includes('2') ?? false,
                evening: this.customUser[prop]?.includes('3') ?? false,
            };
        }
        return availability;
    }
    get age() {
        return this.customUser.birthdate ? differenceInYears(new Date(), this.customUser.birthdate) : 0;
    }
    get initialZoomLevel() {
        return this.customUser.place?.getInitialZoomLevel(this.webrole_id ?? undefined);
    }
    get roleName() {
        return this.webrole_id ? (WebRoleId[this.webrole_id] as WebRoleName) : undefined;
    }
    get localeId() {
        return this.customUser.locale_id ?? config.getConfig(this.brandCode).defaultLocaleId;
    }

    private loadingQueue: Record<string, (() => void)[] | undefined> = {};

    @AfterCreate
    static async createCustomWebuser(instance: User) {
        const models = instance.sequelize.models;
        const webuserUrl = await models.User.createWebuserUrl(instance.brandCode);

        await Promise.all([
            models.CustomUser.create({
                webuser_id: instance.webuser_id,
                webuser_url: webuserUrl,
                token_code: StringUtil.randomString(8, true),
                updated: new Date(),
                verified: 1,
                messages_mail: 1,
                share_information: 1,
                automatch_mail: MatchmailSetting.weekly,
                show_mobile: 1,
                pref_playdate: 0,
            }),
            models.Availability.create({ webuser_id: instance.webuser_id }),
            models.FosterProperties.create({ webuser_id: instance.webuser_id }),
            models.FosterSearchPreferences.create({ webuser_id: instance.webuser_id }),
            models.ParentSearchPreferences.create({ webuser_id: instance.webuser_id }),
            models.NotificationSettings.create({ webuser_id: instance.webuser_id }),
        ]);
    }

    @BeforeDestroy
    static async cleanElastic(instance: User) {
        if (Environment.isApiTests) {
            // Inlined call to Client here otherwise we are getting circular dependency ElasticUser <-> User
            await client
                .delete({
                    index: `${Environment.apiKeys.elasticsearch_index_prefix}-${instance.brandCode}`,
                    type: '_doc',
                    id: instance.webuser_id.toString(),
                    refresh: true,
                })
                .catch(_ => {});
        }
    }

    @BeforeFind
    static customUserLoading(options: FindOptions<UserColumns>) {
        const customUserAssociation = (options.include as IncludeOptions[])?.find(item => item.as === 'customUser');
        if (customUserAssociation) {
            customUserAssociation.required = true;
        }
    }

    getAvatarUrl(size?: number, returnPlaceholder = false) {
        let avatarUrl = this.customUser.avatar_url;
        if (avatarUrl) {
            if (size) {
                avatarUrl = avatarUrl.replace('[size]', `${size}`);
            }
            return `${Environment.apiKeys.cdn_url}${avatarUrl}`;
        }

        if (returnPlaceholder) {
            return `https://cdn.sitly.com/images/placeholders/${
                this.isParent ? 'parent' : this.customUser.gender === 'm' ? 'sitter-male' : 'sitter-female'
            }.png`;
        }
    }

    getDistance(lat: number | null, lng: number | null) {
        if (!lat || !lng || !this.customUser?.map_latitude || !this.customUser?.map_longitude) {
            return 0;
        }
        const distance = Util.calculateDistanceInMeters(this.customUser.map_latitude, this.customUser.map_longitude, lat, lng) / 1000;
        return parseFloat(distance.toFixed(1));
    }

    async premiumStartDate() {
        const payment = await this.customUser.lastPaidPayment([{ order_type: PaymentType.initial }]);
        return payment?.created;
    }

    static passwordFields(password: string) {
        const salt = StringUtil.randomString(15, true);
        const encryptedPassword = CryptoUtil.encryptPassword(password, salt);
        return {
            password: encryptedPassword,
            salt,
        };
    }

    static async emailExists(email: string) {
        const count = await this.count({ where: { email } });
        return count > 0;
    }

    async jobPostingDisabledTill() {
        await this.customUser.reload({ include: 'jobPostings' });
        const thirtyDaysAgo = sub(new Date(), { days: 30 });
        const filtered = (this.customUser.jobPostings ?? []).filter(item => differenceInDays(item.created_at, thirtyDaysAgo) > 0);
        if (filtered.length >= 2) {
            const minDate = filtered
                .map(item => item.created_at)
                .reduce((prev, current) => (prev < current ? prev : current), thirtyDaysAgo);
            return add(minDate, { days: 31 }).toISOString();
        }
        return undefined;
    }

    async hasBlockForUser(userId: number) {
        const blockedUserIds = await this.excludedUserIds(UserExclusionType.blocked);
        return blockedUserIds.includes(userId);
    }

    async excludedUserIds(exclusionType?: UserExclusionType) {
        const excludedUsers = await this.sequelize.models.UserExclusion.findAll({
            attributes: [[Sequelize.literal(`IF(webuser_id = ${this.webuser_id}, exclude_webuser_id, webuser_id)`), 'excluded_user_id']],
            where: {
                [Op.or]: [{ webuser_id: this.webuser_id }, { exclude_webuser_id: this.webuser_id }],
                ...(exclusionType ? { exclude_type: exclusionType } : {}),
            },
        });
        return excludedUsers.map(item => (item.dataValues as unknown as { excluded_user_id: number }).excluded_user_id);
    }

    static async byId(
        userId: number,
        options?: {
            includeInactive?: boolean;
            includeDeleted?: boolean;
        },
        customUserIncludes?: (keyof CustomUserRelations)[],
    ) {
        return this.findOne({
            where: {
                webuser_id: userId,
                ...(options?.includeInactive ? {} : { active: 1 }),
            },
            include: {
                association: 'customUser',
                where: options?.includeDeleted ? {} : { deleted: 0 },
                include: customUserIncludes ? CustomUser.includes(customUserIncludes) : [],
            },
        });
    }

    static async byIdForGem(userId: number) {
        return this.findOne({
            where: {
                webuser_id: userId,
            },
            include: [
                {
                    association: 'customUser',
                    required: true,
                    include: [
                        ...CustomUser.includes([
                            'place',
                            'photos',
                            'children',
                            'parentSearchPreferences',
                            'allPayments',
                            'recommendations',
                        ]),
                        { association: 'warnings', separate: true, include: ['photo'] },
                    ],
                },
            ],
        });
    }

    static async byIds(
        userIds: number[],
        customUserIncludes?: (keyof CustomUserRelations)[],
        customUserWhere: Partial<CustomUserColumns> = {},
    ) {
        if (userIds.length === 0) {
            return [];
        }
        return this.findAll({
            where: {
                webuser_id: userIds,
                active: 1,
            },
            include: {
                association: 'customUser',
                where: {
                    deleted: 0,
                    ...customUserWhere,
                },
                include: CustomUser.includes(
                    customUserIncludes?.includes('warnings') ? customUserIncludes : ['warnings', ...(customUserIncludes ?? [])],
                ),
            },
            order: Sequelize.literal(`FIELD(User.webuser_id, ${userIds.join(',')})`),
        });
    }

    static async byUserUrl(
        userUrl: string,
        options: {
            includeDeleted?: boolean;
            includeDisabled?: boolean;
            includeInappropriate?: boolean;
            includeIncomplete?: boolean;
            includeInactive?: boolean;
            includeInvisible?: boolean;
        } = {},
        customUserIncludes?: (keyof CustomUserRelations)[],
    ) {
        const where = { ...CustomUser.defaultWhere } as Partial<typeof CustomUser.defaultWhere>;
        if (options.includeIncomplete) {
            delete where.completed;
        }
        if (options.includeDeleted) {
            delete where.deleted;
        }
        if (options.includeDisabled) {
            delete where.disabled;
        }
        if (options.includeInappropriate) {
            delete where.inappropriate;
        }
        if (options.includeInvisible) {
            delete where.invisible;
        }
        return this.findOne({
            where: options.includeInactive ? {} : { active: 1 },
            include: {
                association: 'customUser',
                where: {
                    webuser_url: userUrl,
                    ...where,
                },
                include: CustomUser.includes(customUserIncludes ?? []),
            },
        });
    }

    static byUserUrls(userUrls: string[]) {
        return this.findAll({
            where: { active: 1 },
            include: {
                association: 'customUser',
                where: {
                    deleted: 0,
                    disabled: 0,
                    webuser_url: userUrls,
                },
            },
        });
    }

    static byUserUrlAndTokenCode(userUrl: string, tokenCode: string) {
        return this.findOne({
            include: {
                association: 'customUser',
                where: { webuser_url: userUrl, token_code: tokenCode },
            },
        });
    }

    static byFacebookId(facebookId: string) {
        return this.findOne({
            where: {
                'active': 1,
                '$customUser.deleted$': 0,
                '$customUser.facebook_id$': facebookId,
            },
            include: 'customUser',
        });
    }

    static byEmail(email: string, includeInactive = false) {
        return this.findOne({
            where: {
                email,
                ...(includeInactive ? {} : { active: 1 }),
            },
            include: 'customUser',
        });
    }

    static async byEmailOrFacebookId(email: string | undefined, facebookId: string) {
        if (!email && !facebookId) {
            return null;
        }

        let emailExists = false;
        if (email) {
            emailExists = await this.emailExists(email);
        }

        const userWhere: WhereOptions<UserColumns> = {
            active: 1,
        };
        const customUserWhere: WhereOptions<CustomUserColumns> = {
            deleted: 0,
        };

        if (emailExists) {
            userWhere.email = email;
        } else if (facebookId) {
            customUserWhere.facebook_id = facebookId;
        }

        return this.findOne({
            where: userWhere,
            include: {
                association: 'customUser',
                where: customUserWhere,
            },
        });
    }

    static async login(email: string, suppliedPassword: string) {
        const user = await this.findOne({
            where: { email, active: 1 },
            include: 'customUser',
        });

        if (!user?.salt) {
            return null;
        }
        const { password, salt } = user;
        const encryptedSuppliedPassword = CryptoUtil.encryptPassword(suppliedPassword, salt);
        if (encryptedSuppliedPassword === password) {
            return user;
        }

        await user.customUser.update({
            login_attempt_count: Sequelize.literal('IF(login_attempt_count IS NULL, 1, login_attempt_count + 1)'),
        });
        await user.customUser.reload();

        if (user.customUser.login_attempt_count && user.customUser.login_attempt_count >= 5) {
            await Util.wait((user.customUser.login_attempt_count - 4) * 200);
        }

        return null;
    }

    async getFavoriteUsers(customUserIncludes?: (keyof CustomUserRelations)[]) {
        return this.getFavorites({
            include: [
                {
                    association: 'customUser',
                    where: CustomUser.defaultWhere,
                    include: CustomUser.includes(customUserIncludes ?? []),
                },
            ],
        });
    }

    async getFavoriteUsersIds() {
        await this.loadRelationInQueue('favorites');
        return this.favorites?.map(item => item.webuser_id) ?? [];
    }

    async removePremium() {
        return this.customUser.update({
            subscription_cancelled: 1,
            subscription_cancellation_date: new Date(),
            premium: null,
        });
    }

    async updateLastSearchActivity(req: UserRequest) {
        const needsToInsertUserActivity = !this.customUser.last_search_activity || !isToday(this.customUser.last_search_activity);
        await optionalAwait(
            Promise.all([
                LogService.logRequest({
                    req,
                    label: 'user.update.last_search_activity',
                    message: new Date().toISOString(),
                    customId: `lsa-${format(new Date(), 'MM-dd-yyyy')}-${this.webuser_id}}`,
                }).catch(_e => {
                    /* do nothing on duplicate log */
                }),
                needsToInsertUserActivity ? this.sequelize.models.UserActivity.insertActivity(this, 1) : undefined,
            ]),
        );
        return this.customUser.update({ last_search_activity: new Date() });
    }

    // ---------- Internal ---------- //
    private async loadRelationInQueue(relation: keyof UserRelations) {
        if (this.loadingQueue[relation]) {
            return new Promise<void>(resolve => {
                this.loadingQueue[relation]?.push(resolve);
            });
        }

        const value = this[relation];
        if (value === undefined) {
            this.loadingQueue[relation] = [];
            if (relation === 'favorites') {
                this.favorites = await this.getFavoriteUsers();
            } else {
                await this.reload({ include: relation });
            }
            this.loadingQueue[relation]?.forEach(pr => pr());
            this.loadingQueue[relation] = undefined;
        }
    }

    private static async createWebuserUrl(brandCode: BrandCode) {
        const initialWebuserUrl = StringUtil.randomString(6, false, true);
        const similarWebuserUrls = (
            await this.sequelize.models.CustomUser.findAll({
                where: { webuser_url: { [Op.startsWith]: initialWebuserUrl } },
                attributes: ['webuser_url'],
                raw: true,
            })
        ).map(item => item.webuser_url);

        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let uniqueWebuserUrl = initialWebuserUrl;
        const webuserUrlMaxLength = 14;
        while (similarWebuserUrls.includes(uniqueWebuserUrl)) {
            uniqueWebuserUrl = uniqueWebuserUrl + '' + chars[Util.rand(0, chars.length - 1)];
            if (uniqueWebuserUrl.length > webuserUrlMaxLength) {
                SentryService.captureException(new Error('Created webuserUrl is too long'), 'user creation error', brandCode, {
                    webuserUrl: uniqueWebuserUrl,
                });
                uniqueWebuserUrl = initialWebuserUrl;
            }
        }
        return uniqueWebuserUrl;
    }
}
