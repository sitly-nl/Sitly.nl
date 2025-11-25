import { config } from '../../../config/config';
import { Language } from '../../Language';
import { AvatarValidationType } from '../../services/avatar-validation/avatar-validation.service';
import { Environment } from '../../services/env-settings.service';
import { PageUrlService } from '../../services/page-url.service';
import { Util } from '../../utils/util';
import { PaymentMethodType, PSP } from '../payment.model';
import { ChildResponse } from './child-response';
import { PaymentResponse } from './payment-response';
import { PhotoResponse } from './photo-response';
import { PlaceResponse } from './place-response';
import { RecommendationResponse } from './recommendation-response';
import { ReferenceResponse } from './reference-response';
import { SubscriptionResponse } from './subscription-response';
import { UserResponseAttributes } from './user-response.attributes';
import { WarningResponse } from './warning-response';
import { genderMap, UserWarningLevel } from '../../types';
import { User, WebRoleId } from '../user/user.model';
import { UserWarningType } from '../user-warning.model';
import { isBefore, sub } from 'date-fns';
import { Op } from 'sequelize';
import { FeaturesService } from '../../services/features/features.service';
import { LinksService } from '../../services/links.service';
import { ConnectionInviteStatus } from '../connection-invite.model';
import { CryptoUtil } from '../../utils/crypto-util';

export interface DayAvailabilityInterface {
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
}

export interface Availability {
    monday: DayAvailabilityInterface;
    tuesday: DayAvailabilityInterface;
    wednesday: DayAvailabilityInterface;
    thursday: DayAvailabilityInterface;
    friday: DayAvailabilityInterface;
    saturday: DayAvailabilityInterface;
    sunday: DayAvailabilityInterface;
}

export type UserSerializationType = 'regular.base' | 'regular.full' | 'regular.me' | 'internal.base' | 'internal.full';

export interface UserAttributesContext {
    type: UserSerializationType;
    customSetter?: (user: User, userResponse: UserResponse) => Promise<void> | void;
    user?: User;
    localeCode?: string;
    include?: {
        place?: boolean;
        subscription?: boolean;
        references?: boolean;
    };
}

export class UserResponse {
    static readonly keys = UserResponseAttributes;
    private customUser = this.user.customUser;

    id = this.context.type.startsWith('internal.') ? this.customUser.webuser_id : this.customUser.webuser_url;
    role = this.user.roleName;
    active = this.user.active;
    isPremium = this.user.isPremium;
    firstName = this.user.first_name;
    lastLogin = this.user.last_login?.toISOString();
    created = this.user.created?.toISOString();
    email = this.user.email;
    avatarUrl = this.user.getAvatarUrl();

    webuserUrl = this.customUser.webuser_url;
    lastSearchActivity = this.customUser.last_search_activity?.toISOString();
    updated = this.customUser.updated?.toISOString();
    about = this.customUser.about;
    avatar = this.customUser.avatar ?? this.user.getAvatarUrl(); // kept for compatibility with old versions of mobile apps
    completed = !!this.customUser.completed;
    receiveNewMessagesMail = !!this.customUser.messages_mail;
    receiveMatchMail =
        this.customUser.automatch_mail === null ? null : { 0: 'never', 1: 'daily', 2: 'weekly' }[this.customUser.automatch_mail];
    hasPublicProfile = !this.customUser.private_only;
    shareProfileWithPartners = !!this.customUser.share_information;
    disabled = !!this.customUser.disabled;
    deleted = !!this.customUser.deleted;
    subscriptionCancelled = !!this.customUser.subscription_cancelled;
    facebookId = this.customUser.facebook_id ? +this.customUser.facebook_id : null;
    availableForChat = this.user.availableForChat;
    inappropriate = this.customUser.inappropriate;
    invisible = this.customUser.invisible;
    suspected = this.customUser.suspected;
    quarantinedAt = this.customUser.quarantined_at?.toISOString();
    notes = this.customUser.notes;
    gracePeriod = this.customUser.grace_period?.toISOString();
    premiumExtensionUsed = this.customUser.free_premium_extension_used;
    discountPercentage = this.customUser.discount_percentage;
    subscriptionCancellationDate = this.customUser.subscription_cancellation_date?.toISOString();
    streetName = this.customUser.address;
    houseNumber = this.customUser.housenumber;
    postalCode = this.customUser.postal_code;
    disabledSafetyMessages = this.customUser.disabled_safety_messages;
    averageRecommendationScore = this.customUser.average_recommendation_score;
    discountOfferedDate = this.customUser.discount_offered_date?.toISOString();
    availabilityUpdated = this.customUser.availability_updated?.toISOString();
    gender = this.customUser.gender === null ? null : genderMap[this.customUser.gender];
    emailBounced = this.customUser.email_bounced;

    placeName = this.customUser.place?.place_name;
    localeCode = (this.user.customUser.locale?.locale_code ?? '').replace('_', '-');

    initialZoomLevel = this.user.initialZoomLevel;
    aTestVersion = this.user.webuser_id % 2 === 0;

    hasConversation?: boolean;
    freePremiumExtensionAvailable?: boolean;
    hasAvatarWarning?: boolean;
    potentialNonresponder?: boolean;
    inviteToApply?: boolean;
    intercomHmac?: string;
    isFavorite?: boolean;
    reEnabled?: boolean;
    internalUserId?: number;
    age?: number;
    distance?: number;
    completionUrl?: string;
    publicProfileUrl?: string;
    info: string | null;
    education: string | null;
    homepage: string | null;
    latitude: number | null;
    longitude: number | null;
    province?: string;
    jobPostingDisabledTill: string | undefined;
    premiumExpiryDate: string | null;
    subscriptionPsp: string | undefined;
    paymentMethod: PaymentMethodType | null;
    lastName: string | null;
    birthdate: string | null;
    hasSentConnectionInviteToMe?: boolean;
    hasReceivedConnectionInviteFromMe?: boolean;

    searchPreferences: Record<string, unknown>;
    fosterProperties?: {
        isEducated: boolean | null;
        averageHourlyRate: string | null;
        [selector: string]: unknown;
    };
    place?: PlaceResponse;
    subscription?: SubscriptionResponse;
    accessToken?: unknown;
    photos?: PhotoResponse[];
    references?: ReferenceResponse[];
    recommendations?: RecommendationResponse[];
    children?: ChildResponse[];
    payments?: PaymentResponse[];
    warnings?: WarningResponse[];
    similar?: UserResponse[];
    relevanceSortingStats?: {
        match: number;
        weights: unknown;
    };

    private constructor(
        private user: User,
        private context: UserAttributesContext,
    ) {}

    // eslint-disable-next-line complexity
    static async instance(user: User, context: UserAttributesContext) {
        const customUser = user.customUser;
        const contextUser = context.user;
        const models = user.sequelize.models;

        const attrs = new UserResponse(user, context);
        attrs.fillAddressFields();

        if (!context.type.endsWith('.base')) {
            await attrs.loadPublicProfileUrl();
        }

        if (context.type === 'regular.me' || context.type.startsWith('internal.')) {
            if (context.type === 'regular.me') {
                attrs.freePremiumExtensionAvailable = await customUser.freePremiumExtensionAvailable();
                if (FeaturesService.jobPostingEnabled) {
                    attrs.jobPostingDisabledTill = await user.jobPostingDisabledTill();
                }
                attrs.intercomHmac = CryptoUtil.generateHmac(customUser.webuser_url, Environment.apiKeys.intercom_identity_key);
                if (customUser.place?.province_id) {
                    const province = await models.Province.findByPk(customUser.place?.province_id);
                    attrs.province = province?.province_name;
                }
            }

            if (contextUser && !contextUser.customUser.completed) {
                attrs.completionUrl = LinksService.completionUrl(contextUser);
            }

            if (attrs.isPremium) {
                attrs.premiumExpiryDate = (customUser.premium ?? customUser.grace_period)?.toISOString() ?? null;
                if (context.type !== 'internal.base') {
                    const lastPayment = await customUser.lastPaidPayment();
                    attrs.subscriptionPsp = lastPayment?.psp ?? PSP.adyen;
                    attrs.paymentMethod = lastPayment?.payment_method ?? null;
                }
            }
            attrs.lastName = user.last_name;
            attrs.birthdate = customUser.birthdate?.toISOString() ?? null;
        } else {
            if (contextUser) {
                const favorites = await contextUser.getFavoriteUsersIds();
                attrs.isFavorite = favorites.includes(user.webuser_id);

                if (context.type === 'regular.full') {
                    attrs.hasConversation = (await models.Message.getMessagesCount(user.webuser_id, contextUser.webuser_id)) > 0;

                    // TODO: merge sentMessagesCount with getMessagesCount ?
                    attrs.potentialNonresponder =
                        !!user.customUser.last_search_activity &&
                        isBefore(user.customUser.last_search_activity, sub(new Date(), { days: 60 })) &&
                        ((await models.Message.getSentMessagesCount(user.webuser_id, contextUser.webuser_id)) ?? 0) === 0;
                    attrs.inviteToApply =
                        contextUser.isParent && contextUser.isPremium && !contextUser.rateLimitExceeded && !attrs.hasConversation;

                    if (FeaturesService.connectionInvitesEnabled(user.brandCode)) {
                        const invites = await user.sequelize.models.ConnectionInvite.findAll({
                            attributes: ['sender_id'],
                            where: {
                                [Op.or]: [
                                    { sender_id: contextUser.webuser_id, receiver_id: user.webuser_id },
                                    { receiver_id: contextUser.webuser_id, sender_id: user.webuser_id },
                                ],
                                invite_status: {
                                    [Op.ne]: ConnectionInviteStatus.expired,
                                },
                            },
                        });
                        attrs.hasSentConnectionInviteToMe = invites.some(item => item.sender_id === user.webuser_id);
                        attrs.hasReceivedConnectionInviteFromMe = invites.some(item => item.sender_id === contextUser.webuser_id);
                    }
                }
            }

            if (customUser.inappropriate) {
                attrs.avatarUrl = undefined;
                attrs.avatar = undefined;
                attrs.about = '';
                customUser.photos = undefined;
            }

            const avatarWarnings = customUser.warnings?.filter(
                warning => warning.warning_type === UserWarningType.avatar && warning.warning_level !== UserWarningLevel.ignored,
            );
            if (avatarWarnings?.some(item => item.warning_phrases?.includes(AvatarValidationType.explicitContent))) {
                attrs.avatarUrl = undefined;
                attrs.avatar = undefined;
                customUser.photos = undefined;
            } else if (avatarWarnings?.some(item => [UserWarningLevel.moderate, UserWarningLevel.severe].includes(item.warning_level))) {
                attrs.hasAvatarWarning = true;
            }
        }

        if (customUser.photos) {
            attrs.photos = customUser.photos
                .sort((a, b) => a.instance_order - b.instance_order)
                .map(photo => PhotoResponse.instance(photo, user));
        }
        if (customUser.allPayments) {
            attrs.payments = customUser.allPayments.map(item => PaymentResponse.instance(item));
        }
        if (customUser.warnings) {
            attrs.warnings = await Promise.all(customUser.warnings.map(warning => WarningResponse.instance(warning, user)));
        }

        if (context.include?.place && customUser.place) {
            attrs.place = PlaceResponse.instance(customUser.place);
        }
        if (context.include?.subscription && customUser.subscription) {
            attrs.subscription = SubscriptionResponse.instance(customUser.subscription);
        }

        if (user.isParent) {
            attrs.fillParent();
        } else {
            attrs.fillFoster();
        }

        await context.customSetter?.(user, attrs);

        return attrs;
    }

    async fillSimilar(similar: User[], include: typeof this.context.include) {
        const similarContext = {
            type: 'regular.base' as const,
            include,
            localeCode: this.context.localeCode,
            user: this.context.user,
        };
        this.similar = await Promise.all(similar.map(user => UserResponse.instance(user, similarContext)));
    }

    private fillFoster() {
        if (this.customUser.type_experience === undefined) {
            throw new Error('wrong foster provided: ' + JSON.stringify(this.user));
        }

        this.info = this.customUser.foster_info;
        this.age = this.user.age;
        this.searchPreferences = {
            maxDistance: this.customUser.pref_max_distance,
            age: {
                min: this.customUser.pref_min_age,
                max: this.customUser.pref_max_age,
            },
            maxChildren: +(this.customUser.max_babysit_children ?? ''),
        };

        let isEducated = this.toNullOrBool(this.customUser.foster_educated);
        if (!isEducated) {
            isEducated = !!this.customUser.education?.trim() || isEducated;
        }

        const typeExperience = this.customUser.type_experience ?? '';
        const ageGroupExperience = {
            '0': typeExperience.indexOf('0') > -1,
            '1-3': typeExperience.indexOf('1_3') > -1,
            '4-6': typeExperience.indexOf('4_6') > -1,
            '7-11': typeExperience.indexOf('7_11') > -1,
            '12plus': typeExperience.indexOf('12plus') > -1,
        };
        let isExperienced = this.toNullOrBool(this.customUser.foster_experienced);
        if (!isExperienced && typeExperience && Object.values(ageGroupExperience).some(item => item)) {
            isExperienced = true;
        }
        if (!isExperienced && +(this.customUser.years_experience ?? '') > 0) {
            isExperienced = true;
        }

        const location = {
            visit: this.toNullOrBool(this.customUser.foster_visit),
            receive: this.toNullOrBool(this.customUser.foster_receive),
        };
        const languageCode = this.context.localeCode?.split('_').shift();
        this.fosterProperties = {
            isAvailableAfterSchool: this.toNullOrBool(this.customUser.foster_after_school),
            isAvailableOccasionally: this.toNullOrBool(this.customUser.foster_occasional),
            isAvailableRegularly: this.toNullOrBool(this.customUser.foster_regular),
            isRemoteTutor: this.toNullOrBool(this.customUser.foster_remote_tutor),
            isExperienced,
            isEducated,
            hasReferences: this.toNullOrBool(this.customUser.foster_references),
            occupation: this.customUser.dayjob,
            availableFromDate: this.customUser.available_from_date?.toISOString(),
            yearsOfExperience: this.customUser.years_experience,
            ageGroupExperience,
            languages:
                this.customUser.languages
                    ?.split(',')
                    .map(localLanguageName => this.formatLanguage(localLanguageName, languageCode))
                    .filter((lang, index, self) => lang && self.findIndex(t => t?.code === lang.code) === index) ?? null, // remove duplicates
            averageHourlyRate:
                this.customUser.avg_hourly_rate === null ? null : this.customUser.avg_hourly_rate.replace('_', '-').toLowerCase(),
            isSmoker: this.toNullOrBool(this.customUser.smoke),
            nativeLanguage: this.formatLanguage(this.customUser.mother_language, languageCode),
            fosterChores: {
                chores: this.toNullOrBool(this.customUser.foster_chores),
                driving: this.toNullOrBool(this.customUser.foster_driving),
                shopping: this.toNullOrBool(this.customUser.foster_shopping),
                cooking: this.toNullOrBool(this.customUser.foster_cooking),
                homework: this.toNullOrBool(this.customUser.foster_homework),
            },
            fosterLocation: location,
            // HACK to keep api backwards compatible with old app versions
            location,
            availability: this.user.availability,
            hasFirstAidCertificate: this.toNullOrBool(this.customUser.fosterProperties?.has_first_aid_certificate),
            hasCertificateOfGoodBehavior: this.toNullOrBool(this.customUser.fosterProperties?.has_certificate_of_good_behavior),
            hasDriversLicense: this.toNullOrBool(this.customUser.fosterProperties?.has_drivers_license),
            hasCar: this.toNullOrBool(this.customUser.fosterProperties?.has_car),
            skills: this.customUser.fosterProperties?.skills,
            traits: this.customUser.fosterProperties?.traits,
        };

        if (this.user.webrole_id === WebRoleId.childminder) {
            this.education = this.customUser.education;
            this.homepage = this.customUser.homepage;
        }

        if (this.context.include?.references && this.customUser.references) {
            this.references = this.customUser.references.map(item => ReferenceResponse.instance(item));
        }

        if (this.customUser.recommendations) {
            this.recommendations = this.customUser.recommendations.map(item => RecommendationResponse.instance(item));
        }
    }

    private fillParent() {
        const languageCode = this.context.localeCode?.split('_').shift();

        this.searchPreferences = {
            babysitters: !!this.customUser.pref_babysitter,
            childminders: config.getConfig(this.user.brandCode).showChildminders ? !!this.customUser.pref_childminder : undefined,
            parent: !!(
                this.customUser.pref_sharing ||
                this.customUser.pref_exchange ||
                this.customUser.pref_coop ||
                this.customUser.pref_playdate ||
                this.customUser.pref_after_school
            ),
            afterSchool: this.toNullOrBool(this.customUser.pref_after_school),
            occasionalCare: this.toNullOrBool(this.customUser.pref_occasional),
            regularCare: this.toNullOrBool(this.customUser.pref_regular),
            remoteTutor: this.toNullOrBool(this.customUser.pref_remote_tutor),
            playdate: this.toNullOrBool(this.customUser.pref_playdate),
            maxDistance: this.customUser.pref_max_distance,
            gender: this.customUser.pref_gender ? genderMap[this.customUser.pref_gender] : null,
            languages:
                this.customUser.pref_languages
                    ?.split(',')
                    .map(localLanguageName => this.formatLanguage(localLanguageName, languageCode))
                    .filter((lang, index, self) => lang && self.findIndex(t => t?.code === lang.code) === index) ?? null, // remove duplicates
            fosterLocation: {
                visit: !!this.customUser.pref_visit,
                receive: !!this.customUser.pref_receive,
            },
            availability: this.user.availability,
            chores: this.customUser.parentSearchPreferences?.chores,
            hourlyRates: this.customUser.parentSearchPreferences?.hourly_rates?.map(item => item.replace('_', '-')),
        };

        if (this.customUser.children) {
            this.children = this.customUser.children.map(item => ChildResponse.instance(item)).filter(child => child.age < 15);
        }
    }

    private fillAddressFields() {
        let { map_latitude, map_longitude } = this.customUser;
        if (this.context.type !== 'regular.me' && map_latitude && map_longitude) {
            // Shuffle coordinates around a bit for privacy reasons.
            // We can't used randomized shuffling, because then pins would jump around on the map
            // therefore, we shuffle them according to the last digit of the coordinate
            const lastLatDigit = +map_latitude.toString().slice(-1);
            const lastLngDigit = +map_longitude.toString().slice(-1);

            // +/- 50 meters
            const deltaLatDistance = 10 * (5 - lastLatDigit);
            const deltaLngDistance = 10 * (5 - lastLngDigit);

            const r = 6378137;
            const dLat = deltaLatDistance / r;
            const dLon = deltaLngDistance / (r * Math.cos(Util.deg2rad(map_latitude)));

            map_latitude += Util.rad2deg(dLat);
            map_longitude += Util.rad2deg(dLon);
        }
        this.latitude = map_latitude;
        this.longitude = map_longitude;
        this.distance = this.context.user?.getDistance(map_latitude, map_longitude);
    }

    private async loadPublicProfileUrl() {
        const pageUrlService = new PageUrlService(this.user.brandCode, undefined);
        this.publicProfileUrl = await pageUrlService.getPublicProfileUrl(this.user);
    }

    private toNullOrBool(value: number | null | undefined) {
        return value === null || typeof value === 'undefined' ? null : !!value;
    }

    private formatLanguage(localLanguageName: string | null, requestLanguageCode?: string) {
        if (!localLanguageName) {
            return null;
        }

        if (requestLanguageCode) {
            const lang = Language.getLanguage(localLanguageName, requestLanguageCode);
            if (lang) {
                return lang;
            }
        }

        return {
            code: '',
            localName: '',
            name: localLanguageName,
        };
    }
}
