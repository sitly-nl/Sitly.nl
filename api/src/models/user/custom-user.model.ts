import { BelongsTo, BelongsToMany, Column, DataType, ForeignKey, HasMany, HasOne, Table } from 'sequelize-typescript';
import { ColumnDateOnly, ColumnSet, ColumnTimestamp, CountryBaseModel } from '../base.model';
import { Child } from '../child.model';
import { JobPosting } from '../job-posting.model';
import { Locale, LocaleId } from '../locale.model';
import { PaymentType } from '../payment-types';
import { Payment, PaymentColumns } from '../payment.model';
import { Photo } from '../photo.model';
import { Place } from '../place.model';
import { Recommendation } from '../recommendation.model';
import { Reference } from '../reference.model';
import { Subscription } from '../subscription.model';
import { UserWarning } from '../user-warning.model';
import { Availability } from './availability.model';
import { FosterProperties } from './foster-properties.model';
import { ParentSearchPreferences } from './parent-search-preferences.model';
import { User } from './user.model';
import { UserWarningLevel } from '../../types';
import { Device } from '../device.model';
import { ExternalServices } from './user-external-service.model';
import { UserExclusion, UserExclusionType } from '../user-exclusion.model';
import { Prompt } from '../prompt.model';
import { FindOptions, HasManyGetAssociationsMixin, Includeable, Op, Sequelize, WhereOptions } from 'sequelize';
import { UserCreationInfo } from './user-creation-info.model';

export enum AvatarOverlayType {
    processing = 'processing',
    socialFilter = 'socialFilter',
    socialFilterIgnored = 'socialFilterIgnored',
}

export enum HourlyRate {
    min = '4min',
    fourSix = '4_6',
    sixEight = '6_8',
    eightTen = '8_10',
    tenPlus = '10plus',
    negotiate = 'negotiate',
}
export const allHourlyRates = Object.values(HourlyRate);

export enum DiscountType {
    cancelPremium = 'cancelPremium',
    deleteAccount = 'deleteAccount',
}

export enum MatchmailSetting {
    never = 0,
    daily = 1,
    weekly = 2,
}

export interface CustomUserRelations {
    creationInfo?: UserCreationInfo;
    fosterProperties?: FosterProperties;
    parentSearchPreferences?: ParentSearchPreferences;
    availability?: Availability;
    place?: Place;
    locale?: Locale;
    subscription?: Subscription;
    externalServices?: ExternalServices;

    jobPostings?: JobPosting[];
    warnings?: UserWarning[];
    references?: Reference[];
    recommendations?: Recommendation[];
    allPayments?: Payment[];
    children?: Child[];
    photos?: Photo[];
    prompts?: Prompt[];
    devices?: Device[];
}

export class CustomUserColumns extends CountryBaseModel<
    CustomUserColumns,
    'webuser_id',
    | 'verified'
    | 'completed'
    | 'disabled'
    | 'deleted'
    | 'inappropriate'
    | 'suspected'
    | 'messages_mail'
    | 'subscription_cancelled'
    | 'abuse'
    | 'free_premium_extension_used'
    | 'avatar_warning_ignored'
    | 'non_response_email_sent'
    | 'discount_percentage'
    | 'received_messages_count'
    | 'answered_messages_count'
    | 'foster_visit'
    | 'foster_receive'
    | 'pref_max_distance'
    | 'pref_min_age'
    | 'pref_max_age'
    | 'pref_coop'
    | 'pref_babysitter'
    | 'pref_childminder'
    | 'pref_visit'
    | 'pref_receive'
    | 'pref_sharing'
    | 'pref_exchange'
> {
    @Column({ primaryKey: true, autoIncrement: true })
    @ForeignKey(() => User)
    webuser_id: number;

    @Column(DataType.INTEGER)
    @ForeignKey(() => Place)
    place_id: number | null;

    @Column(DataType.INTEGER)
    @ForeignKey(() => Locale)
    locale_id: LocaleId | null;

    @Column(DataType.INTEGER)
    @ForeignKey(() => Subscription)
    subscription_id: number | null;

    @ColumnTimestamp updated: Date | null;
    @ColumnTimestamp disabled_timestamp: Date | null;
    @ColumnTimestamp birthdate: Date | null;
    @ColumnTimestamp available_from_date: Date | null;
    @ColumnTimestamp last_automatch: Date | null;
    @ColumnDateOnly premium: Date | null;
    @ColumnDateOnly grace_period: Date | null;
    @ColumnDateOnly subscription_cancellation_date: Date | null;
    @ColumnDateOnly discount_offered_date: Date | null;
    @Column(DataType.DATE) session_start_time: Date | null;
    @Column(DataType.DATE) availability_updated: Date | null;
    @Column({ type: DataType.DATE }) last_elastic_sync: Date | null; // in db it is not optional and has '0000-00-00 00:00:00' as default, but seems this is invalid value
    @Column(DataType.DATE) last_search_activity: Date | null;
    @Column(DataType.DATE) message_rate_limit_exceeded_at: Date | null;
    @Column(DataType.DATE) message_rate_limit_warning_expire_at: Date | null;
    @Column(DataType.DATE) quarantined_at: Date | null;

    @Column webuser_url: string;
    @Column(DataType.STRING) gender: 'm' | 'f' | null;
    @Column(DataType.STRING) address: string | null;
    @Column(DataType.STRING) housenumber: string | null;
    @Column(DataType.STRING) postal_code: string | null;
    @Column(DataType.DOUBLE) map_latitude: number | null;
    @Column(DataType.DOUBLE) map_longitude: number | null;
    @Column(DataType.STRING) ip: string | null;
    @Column(DataType.STRING) avatar: string | null;
    @Column(DataType.STRING) avatar_url: string | null;
    @Column(DataType.STRING) facebook_id: string | null;
    @Column(DataType.STRING) facebook_email: string | null;
    @Column({ defaultValue: 0 }) verified: 0 | 1;
    @Column({ defaultValue: 0 }) completed: 0 | 1;
    @Column({ defaultValue: 0 }) disabled: 0 | 1;
    @Column(DataType.STRING) disabled_by: 'user' | 'system' | null;
    @Column({ defaultValue: 0 }) deleted: 0 | 1;
    @Column({ defaultValue: 0 }) inappropriate: 0 | 1;
    @Column({ defaultValue: 0, type: DataType.TINYINT }) invisible: 0 | 1 | null;
    @Column({ defaultValue: 0 }) suspected: 0 | 1;
    @Column({ defaultValue: 0 }) messages_mail: 0 | 1;
    @Column({ defaultValue: 0, type: DataType.TINYINT }) automatch_mail: MatchmailSetting | null;
    @Column({ defaultValue: 0 }) subscription_cancelled: 0 | 1;
    @Column({ defaultValue: 0, type: DataType.TINYINT }) ios_rated: 0 | 1 | null;
    @Column({ defaultValue: 0, type: DataType.TINYINT }) ekomi_rated: 0 | 1 | null;
    @Column({ defaultValue: 0, type: DataType.TINYINT }) android_rated: 0 | 1 | null;
    @Column({ defaultValue: 0, type: DataType.TINYINT }) private_only: 0 | 1 | null;
    @Column(DataType.TINYINT) positive_feedback_accepted: 0 | 1 | null;
    @Column(DataType.TINYINT) negative_feedback_accepted: 0 | 1 | null;
    @Column({ defaultValue: 0 }) abuse: 0 | 1;
    @Column({ defaultValue: 0 }) free_premium_extension_used: 0 | 1;
    @Column({ defaultValue: 0 }) avatar_warning_ignored: 0 | 1;
    @Column({ defaultValue: 0 }) non_response_email_sent: 0 | 1;
    @Column({ defaultValue: 0, type: DataType.TINYINT }) disabled_safety_messages: 0 | 1 | null;
    @Column({ defaultValue: 0, type: DataType.TINYINT }) email_bounced: 0 | 1 | null;
    @Column({ type: DataType.TINYINT }) show_mobile: 0 | 1 | null;
    @Column(DataType.TINYINT) share_information: 0 | 1 | null;
    @Column(DataType.TINYINT) smoke: 0 | 1 | null;
    @Column(DataType.DOUBLE) average_recommendation_score: number | null;
    @Column(DataType.STRING) mother_language: string | null;
    @Column(DataType.STRING) languages: string | null;
    @Column(DataType.STRING) dayjob: string | null;
    @Column(DataType.STRING) avg_hourly_rate: HourlyRate | null;
    @Column(DataType.STRING) years_experience: string | null;
    @Column(DataType.STRING) type_experience: string | null;
    @Column(DataType.STRING) apple_token: string | null;
    @Column(DataType.STRING) google_account_id: string | null;
    @Column(DataType.STRING) education: string | null;
    @Column(DataType.STRING) homepage: string | null;
    @Column(DataType.STRING) about: string | null;
    @Column(DataType.STRING(32)) avatar_overlay: AvatarOverlayType | null;
    @Column({ type: DataType.ENUM(...Object.values(UserWarningLevel)) }) about_warning_level: UserWarningLevel | null;
    @Column(DataType.STRING) about_warning_phrases: string | null;
    @Column(DataType.STRING) token_code: string | null;
    @Column(DataType.STRING) notes: string | null;
    @Column({ defaultValue: 0 }) discount_percentage: number;
    @Column(DataType.STRING) discount_type: DiscountType | null;
    @Column(DataType.INTEGER) profile_view_count: number | null;
    @Column(DataType.INTEGER) login_attempt_count: number | null;
    @Column(DataType.STRING) message_rate_limit_warning_type: string | null;
    @Column({ type: DataType.INTEGER, defaultValue: 0 }) email_complaints_count: number | null;
    @Column({ defaultValue: 0 }) received_messages_count: number;
    @Column({ defaultValue: 0 }) answered_messages_count: number;
    @Column(DataType.STRING) timezone: string | null;
    @ColumnSet elastic_sync: string[] | null;
    @Column(DataType.STRING) active_coupon_code: string | null;

    @Column(DataType.STRING) max_babysit_children: string | null;
    @Column(DataType.TINYINT) foster_experienced: 0 | 1 | null;
    @Column(DataType.TINYINT) foster_remote_tutor: 0 | 1 | null;
    @Column(DataType.TINYINT) foster_educated: 0 | 1 | null;
    @Column(DataType.TINYINT) foster_daycare: 0 | 1 | null;
    @Column(DataType.TINYINT) foster_after_school: 0 | 1 | null;
    @Column(DataType.TINYINT) foster_regular: 0 | 1 | null;
    @Column(DataType.TINYINT) foster_occasional: 0 | 1 | null;
    @Column(DataType.TINYINT) foster_references: 0 | 1 | null;
    @Column({ defaultValue: 0, type: DataType.TINYINT }) foster_chores: 0 | 1 | null;
    @Column(DataType.TINYINT) foster_driving: 0 | 1 | null;
    @Column(DataType.TINYINT) foster_shopping: 0 | 1 | null;
    @Column(DataType.TINYINT) foster_cooking: 0 | 1 | null;
    @Column(DataType.TINYINT) foster_homework: 0 | 1 | null;
    @Column({ defaultValue: '0', type: DataType.STRING }) foster_monday: string | null;
    @Column({ defaultValue: '0', type: DataType.STRING }) foster_tuesday: string | null;
    @Column({ defaultValue: '0', type: DataType.STRING }) foster_wednesday: string | null;
    @Column({ defaultValue: '0', type: DataType.STRING }) foster_thursday: string | null;
    @Column({ defaultValue: '0', type: DataType.STRING }) foster_friday: string | null;
    @Column({ defaultValue: '0', type: DataType.STRING }) foster_saturday: string | null;
    @Column({ defaultValue: '0', type: DataType.STRING }) foster_sunday: string | null;
    @Column(DataType.STRING) foster_info: string | null;
    @Column({ defaultValue: 0 }) foster_visit: number;
    @Column({ defaultValue: 0 }) foster_receive: number;

    @Column(DataType.STRING) pref_monday: string | null;
    @Column(DataType.STRING) pref_tuesday: string | null;
    @Column(DataType.STRING) pref_wednesday: string | null;
    @Column(DataType.STRING) pref_thursday: string | null;
    @Column(DataType.STRING) pref_friday: string | null;
    @Column(DataType.STRING) pref_saturday: string | null;
    @Column(DataType.STRING) pref_sunday: string | null;
    @Column(DataType.STRING) pref_languages: string | null;
    @Column(DataType.STRING) pref_gender: 'm' | 'f' | null;
    @Column(DataType.TINYINT) pref_after_school: 0 | 1 | null;
    @Column(DataType.TINYINT) pref_regular: 0 | 1 | null;
    @Column(DataType.TINYINT) pref_occasional: 0 | 1 | null;
    @Column(DataType.TINYINT) pref_remote_tutor: 0 | 1 | null;
    @Column pref_playdate: 0 | 1;
    @Column({ defaultValue: 5 }) pref_max_distance: number;
    @Column({ defaultValue: -1 }) pref_min_age: number;
    @Column({ defaultValue: 15 }) pref_max_age: number;
    @Column({ defaultValue: 0 }) pref_coop: 0 | 1;
    @Column({ defaultValue: 0 }) pref_babysitter: 0 | 1;
    @Column({ defaultValue: 0 }) pref_childminder: 0 | 1;
    @Column({ defaultValue: 0 }) pref_visit: 0 | 1;
    @Column({ defaultValue: 0 }) pref_receive: 0 | 1;
    @Column({ defaultValue: 0 }) pref_sharing: 0 | 1;
    @Column({ defaultValue: 0 }) pref_exchange: 0 | 1;
}

@Table({ tableName: 'custom_cms_webusers' })
export class CustomUser extends CustomUserColumns implements CustomUserRelations {
    @HasOne(() => UserCreationInfo) creationInfo?: UserCreationInfo;
    @HasOne(() => FosterProperties) fosterProperties?: FosterProperties;
    @HasOne(() => ParentSearchPreferences) parentSearchPreferences?: ParentSearchPreferences;
    @HasOne(() => Availability) availability?: Availability;
    @HasOne(() => ExternalServices) externalServices?: ExternalServices;

    @BelongsTo(() => Place) place?: Place;
    @BelongsTo(() => Locale) locale?: Locale;
    @BelongsTo(() => Subscription) subscription?: Subscription;

    @HasMany(() => JobPosting) jobPostings?: JobPosting[];
    @HasMany(() => Child) children?: Child[];
    @HasMany(() => Photo) photos?: Photo[];
    @HasMany(() => Prompt) prompts?: Prompt[];
    @HasMany(() => UserWarning) warnings?: UserWarning[];
    @HasMany(() => Reference) references?: Reference[];
    @HasMany(() => Recommendation) recommendations?: Recommendation[];
    @HasMany(() => Payment, { scope: { active: 1 } }) allPayments?: Payment[];
    @HasMany(() => Device) devices?: Device[];
    declare getDevices: HasManyGetAssociationsMixin<Device>;

    @BelongsToMany(() => CustomUser, {
        through: () => UserExclusion,
        foreignKey: 'webuser_id',
        otherKey: 'exclude_webuser_id',
        scope: {
            ...CustomUser.defaultWhere,
            '$customUser->hiddenExclusions->UserExclusion.exclude_type$': UserExclusionType.hidden,
        },
    })
    hiddenExclusions: CustomUser[];

    static defaultWhere = {
        disabled: 0,
        deleted: 0,
        inappropriate: 0,
        completed: 1,
        invisible: 0,
    };
    private static oneToManyRelations = new Set<keyof CustomUserRelations>([
        'jobPostings',
        'warnings',
        'references',
        'recommendations',
        'allPayments',
        'children',
        'photos',
        'devices',
        'prompts',
    ]);

    static includes(includes: (keyof CustomUserRelations)[]) {
        return includes.map(item => {
            return {
                association: item,
                separate: CustomUser.oneToManyRelations.has(item),
                ...(item === 'photos' ? { order: ['instance_order', 'instance_id'] } : {}),
                rejectOnEmpty: false,
            } as Includeable;
        });
    }

    static async updateMultiple(webuserIds: number[], data: Partial<CustomUserColumns>) {
        return this.update(data, { where: { webuser_id: webuserIds } });
    }

    static async updateFields(webuserId: number, data: Partial<CustomUserColumns>) {
        return this.update(data, { where: { webuser_id: webuserId } });
    }

    static decreaseLoginAttemptCount() {
        return this.update(
            { login_attempt_count: Sequelize.literal('login_attempt_count - 1') },
            {
                where: {
                    login_attempt_count: { [Op.gt]: 0 },
                },
            },
        );
    }

    reload(options?: Omit<FindOptions, 'include'> & { include: keyof CustomUserRelations | (keyof CustomUserRelations)[] }) {
        if (options?.include) {
            return super.reload({
                ...options,
                include: CustomUser.includes(Array.isArray(options.include) ? options.include : [options?.include]),
            });
        }
        return super.reload(options);
    }

    async freePremiumExtensionAvailable() {
        return !!((await this.lastPayment({ order_type: PaymentType.initial })) && this.free_premium_extension_used === 0);
    }

    lastPayment(whereExtra: WhereOptions<PaymentColumns> = {}) {
        return this.sequelize.models.Payment.findOne({
            where: {
                webuser_id: this.webuser_id,
                active: 1,
                ...whereExtra,
            },
            order: [
                ['created', 'DESC'],
                ['instance_id', 'DESC'],
            ],
        });
    }

    lastPaidPayment(whereExtra: Partial<PaymentColumns>[] = []) {
        return this.sequelize.models.Payment.findOne({
            where: [{ webuser_id: this.webuser_id }, ...Payment.paidWhere, ...whereExtra],
            order: [
                ['created', 'DESC'],
                ['instance_id', 'DESC'],
            ],
        });
    }

    paidPaymentsCount() {
        return this.sequelize.models.Payment.count({
            where: {
                webuser_id: this.webuser_id,
                active: 1,
                paid: 1,
            },
        });
    }

    async loadRelationIfEmpty(name: keyof CustomUserRelations) {
        if (this[name] === undefined) {
            await this.reload({ include: name });
        }
    }
}
