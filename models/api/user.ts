import { PaymentMethodType, PSPType } from 'app/models/api/payment';
import { Recommendation } from 'app/models/api/recommendation';
import { Child } from 'app/models/api/child';
import { Reference } from 'app/models/api/reference';
import { Language } from 'app/models/api/language-interface';
import { Photo, UploadAvatarErrorMeta } from 'app/models/api/photo';
import { AvailabilityUtils, DayPart, WeekDay } from 'app/utils/availability-utils';
import { differenceInDays, differenceInMonths, differenceInWeeks, differenceInSeconds, isAfter, sub } from 'date-fns';
import { Subscription } from 'app/models/api/subscription';
import { BaseApiModel } from 'app/models/api/response';

export type UserAvailabilityInterface = {
    [day in WeekDay]: UserDayAvailabilityInterface;
};

export type UserDayAvailabilityInterface = {
    [day in DayPart]: boolean;
};

export interface SearchPreferencesInterface {
    maxDistance: number;
}

export interface ParentSearchPreferencesInterface extends SearchPreferencesInterface {
    babysitters: boolean;
    childminders: boolean;
    parent: boolean;
    afterSchool?: boolean;
    occasionalCare?: boolean;
    regularCare?: boolean;
    remoteTutor?: boolean;
    playdate?: boolean;
    fosterLocation: {
        visit: boolean;
        receive: boolean;
    };
    availability: UserAvailabilityInterface;
    languages?: Language[];
    gender?: Gender;
    hourlyRates?: string[];
    chores?: FosterChores[];
}

export interface FosterSearchPreferencesInterface extends SearchPreferencesInterface {
    age: {
        min: number;
        max: number;
    };
    maxChildren: number;
}

export interface FosterProperties {
    isAvailableAfterSchool?: boolean;
    isAvailableOccasionally?: boolean;
    isAvailableRegularly?: boolean;
    isRemoteTutor?: boolean;
    isExperienced?: boolean;
    isEducated?: boolean;
    hasReferences?: boolean;
    occupation?: Occupation | DisabledOccupations;
    availableFromDate?: string;
    yearsOfExperience?: YearsExperience;
    ageGroupExperience?: Record<AgeGroup, boolean>;
    languages?: Language[];
    averageHourlyRate?: string;
    isSmoker: boolean | null;
    nativeLanguage: Language | null;
    fosterChores: {
        chores?: boolean;
        driving?: boolean;
        shopping?: boolean;
        cooking?: boolean;
        homework?: boolean;
    };
    fosterLocation: {
        visit: boolean;
        receive: boolean;
    };
    availability: UserAvailabilityInterface;
    hasFirstAidCertificate?: boolean;
    hasCertificateOfGoodBehavior?: boolean;
    hasCar?: boolean;
    skills?: FosterSkill[];
    traits?: FosterTrait[];
}

export enum FosterChores {
    homework = 'homework',
    shopping = 'shopping',
    cooking = 'cooking',
    driving = 'driving',
    chores = 'chores',
}
export const allFosterChores = Object.values(FosterChores);

export enum Occupation {
    scholar = 'scholar',
    student = 'student',
    unemployed = 'unemployed',
    employed = 'employed',
    householder = 'householder',
}
export enum DisabledOccupations {
    retired = 'retired',
    intern = 'intern',
}
export const allOccupationOptions = Object.values(Occupation);

export enum FosterSkill {
    art = 'art',
    music = 'music',
    baking = 'baking',
    sports = 'sports',
    games = 'games',
    storytelling = 'storytelling',
}
export const allFosterSkills = Object.values(FosterSkill);

export enum FosterTrait {
    calm = 'calm',
    patient = 'patient',
    enthusiastic = 'enthusiastic',
    kind = 'kind',
    caring = 'caring',
    creative = 'creative',
    funny = 'funny',
    talkative = 'talkative',
    strict = 'strict',
    tolerant = 'tolerant',
}
export const allFosterTraits = Object.values(FosterTrait);

export enum UserRole {
    parent = 'parent',
    babysitter = 'babysitter',
    childminder = 'childminder',
}

export enum Gender {
    female = 'female',
    male = 'male',
    unknown = 'unknown',
}

export enum OnlineStatus {
    online = 'online',
    away = 'away',
    offline = 'offline',
}

export enum LastSeenStatus {
    online = 'online',
    today = 'today',
    yesterday = 'yesterday',
    twoDaysAgo = 'twoDaysAgo',
    threeDaysAgo = 'threeDaysAgo',
    fourDaysAgo = 'fourDaysAgo',
    fiveDaysAgo = 'fiveDaysAgo',
    sixDaysAgo = 'sixDaysAgo',
    weekAgo = 'weekAgo',
    twoWeeksAgo = 'twoWeeksAgo',
    threeWeeksAgo = 'threeWeeksAgo',
    monthAgo = 'monthAgo',
    greaterThanTwoMonthsAgo = 'greaterThanTwoMonthsAgo',
}

export enum YearsExperience {
    none = '0',
    one = '1',
    two = '2',
    three = '3',
    four = '4',
    five = '5',
    moreThanFive = '5plus',
}

export enum AgeGroup {
    zero = '0',
    oneToThree = '1-3',
    fourToSix = '4-6',
    sevenToEleven = '7-11',
    twelvePlus = '12plus',
}

export class UserIncomplete extends BaseApiModel {
    declare meta: {
        isFavorite: boolean;
        potentialNonresponder?: unknown;
        inviteToApply?: boolean;
        hasReceivedConnectionInviteFromMe?: boolean;
        hasSentConnectionInviteToMe?: boolean;
        hasConversation?: boolean;
        distance: { kilometers: number };
        freePremiumExtensionAvailable?: unknown;
        hasAvatarWarning?: boolean;
        zoomLevel?: number;
        intercomHmac: string;
    };
    declare links: {
        avatar?: string;
        publicProfile?: string;
    };

    completed: boolean;
    role?: UserRole;
    email?: string;
    firstName: string;
    lastName: string;
    about?: string;
    created: string;
    updated: string;
    lastLogin: string;
    latitude: number;
    longitude: number;
    localeCode: string;
    province?: string;
    placeName: string;
    streetName: string;
    houseNumber?: string;
    postalCode: string;
    gender?: Gender;
    age: number;
    education: string;
    averageRecommendationScore: number;
    availabilityUpdated: string;
    birthdate?: string;
    isPremium: boolean;
    premiumExpiryDate: string;
    subscriptionCancelled: boolean;
    paymentMethod: PaymentMethodType;
    availableForChat: boolean;
    receiveMatchMail: string;
    subscriptionPsp: PSPType;
    avatarWarnings: UploadAvatarErrorMeta;
    unsuitablePhotoReason: string;
    hasPublicProfile: boolean;
    shareProfileWithPartners: boolean;
    disabledSafetyMessages: 0 | 1;
    discountOfferedDate: string;
    discountPercentage: number;
    emailBounced: number;
    aTestVersion: boolean;

    // relationships
    searchPreferences: FosterSearchPreferencesInterface & ParentSearchPreferencesInterface;
    fosterProperties: FosterProperties;
    subscription?: Subscription;
    children: Child[] = [];
    references: Reference[] = [];
    photos: Photo[] = [];
    recommendations: Recommendation[] = [];
    similarUsers: User[] = [];

    // local
    isVisited?: boolean;

    get hasFirstName() {
        return (this.firstName?.length ?? 0) > 0;
    }
    get hasRating() {
        return this.averageRecommendationScore > 0;
    }
    get recommendationNumberString() {
        return `${this.recommendations.length ?? 0}`;
    }
    get speaksLanguages() {
        return (this.fosterProperties?.languages ?? []).map(item => item.name).aggregatedDescription();
    }
    get canReactivatePremium() {
        return this.isPremium && this.subscriptionCancelled && !!this.subscription;
    }
    get canResumePremium() {
        return !this.isPremium && !!this.subscription;
    }
    get canCancelPremium() {
        return (
            this.isPremium &&
            !this.subscriptionCancelled &&
            this.subscriptionPsp === PSPType.adyen &&
            this.paymentMethod !== PaymentMethodType.welfareVoucher
        );
    }
    get isParent() {
        return this.role === UserRole.parent;
    }
    get isChildminder() {
        return this.role === UserRole.childminder;
    }
    get isBabysitter() {
        return this.role === UserRole.babysitter;
    }

    get isFavorite() {
        return this.meta.isFavorite;
    }
    set isFavorite(newValue: boolean) {
        this.meta.isFavorite = newValue;
    }

    get isPotentialNonResponder() {
        return this.meta.potentialNonresponder;
    }
    get canBeInvitedToApply() {
        return this.meta.inviteToApply;
    }
    get hasConversation() {
        return !!this.meta.hasConversation;
    }
    get isMale() {
        return this.gender === Gender.male;
    }
    get isFemale() {
        return this.gender === Gender.female;
    }
    get isNew() {
        return isAfter(new Date(this.created), sub(new Date(), { weeks: 1 }));
    }
    get distance() {
        return this.meta.distance?.kilometers ?? 0;
    }
    get freePremiumExtensionAvailable() {
        return this.meta.freePremiumExtensionAvailable ?? false;
    }
    get isAvailable() {
        return (
            !AvailabilityUtils.isEmpty(this.availability) ||
            this.isAvailableAfterSchool ||
            this.isAvailableOccasionally ||
            this.hasRegularCare
        );
    }

    get availability() {
        return this.isParent ? this.searchPreferences.availability : this.fosterProperties.availability;
    }
    set availability(value: UserAvailabilityInterface) {
        (this.isParent ? this.searchPreferences : this.fosterProperties).availability = value;
    }

    get isAvailableOccasionally() {
        return this.isParent ? this.searchPreferences.occasionalCare : this.fosterProperties.isAvailableOccasionally;
    }
    set isAvailableOccasionally(newValue: boolean | undefined) {
        if (this.isParent) {
            this.searchPreferences.occasionalCare = newValue;
        } else {
            this.fosterProperties.isAvailableOccasionally = newValue;
        }
    }

    get isAvailableAfterSchool() {
        return this.isParent ? this.searchPreferences.afterSchool : this.fosterProperties.isAvailableAfterSchool;
    }
    set isAvailableAfterSchool(newValue: boolean | undefined) {
        if (this.isParent) {
            this.searchPreferences.afterSchool = newValue;
        } else {
            this.fosterProperties.isAvailableAfterSchool = newValue;
        }
    }

    get hasRegularCare() {
        return this.isParent ? this.searchPreferences.regularCare : this.fosterProperties.isAvailableRegularly;
    }
    set hasRegularCare(newValue: boolean | undefined) {
        if (this.isParent) {
            this.searchPreferences.regularCare = newValue;
        } else {
            this.fosterProperties.isAvailableRegularly = newValue;
        }
    }

    get remoteTutoring() {
        return this.isParent ? this.searchPreferences.remoteTutor : this.fosterProperties.isRemoteTutor;
    }
    set remoteTutoring(newValue: boolean | undefined) {
        if (this.isParent) {
            this.searchPreferences.remoteTutor = newValue;
        } else {
            this.fosterProperties.isRemoteTutor = newValue;
        }
    }

    get onlineStatus() {
        if (!this.lastLoginDate) {
            return OnlineStatus.offline;
        }

        const now = new Date();
        const date = new Date(this.lastLoginDate);

        const days = differenceInDays(now, date);
        if (days < 1) {
            return OnlineStatus.online;
        }

        const weeks = differenceInWeeks(now, date);
        if (weeks <= 3) {
            return OnlineStatus.away;
        }

        return OnlineStatus.offline;
    }

    get lastSeenStatus() {
        if (!this.lastLoginDate) {
            return LastSeenStatus.greaterThanTwoMonthsAgo;
        }

        const now = new Date();
        const date = new Date(this.lastLoginDate);
        const days = differenceInDays(now, date);
        const seconds = differenceInSeconds(now, date);

        if (seconds <= 59) {
            return LastSeenStatus.online;
        } else if (days < 1) {
            return LastSeenStatus.today;
        } else if (days < 2) {
            return LastSeenStatus.yesterday;
        } else if (days < 3) {
            return LastSeenStatus.twoDaysAgo;
        } else if (days < 4) {
            return LastSeenStatus.threeDaysAgo;
        } else if (days < 5) {
            return LastSeenStatus.fourDaysAgo;
        } else if (days < 6) {
            return LastSeenStatus.fiveDaysAgo;
        } else if (days < 7) {
            return LastSeenStatus.sixDaysAgo;
        }

        const weeks = differenceInWeeks(now, date);
        if (weeks < 2) {
            return LastSeenStatus.weekAgo;
        } else if (weeks < 3) {
            return LastSeenStatus.twoWeeksAgo;
        } else if (days < 4) {
            return LastSeenStatus.threeWeeksAgo;
        }

        const months = differenceInMonths(now, date);
        if (months < 2) {
            return LastSeenStatus.monthAgo;
        }

        return LastSeenStatus.greaterThanTwoMonthsAgo;
    }

    get lastLoginDate() {
        return this.lastLogin || this.created;
    }

    get defaultAvatar() {
        return `assets/images/placeholders/${
            this?.isParent ? 'parent' : this?.gender === Gender.male ? 'sitter-male' : 'sitter-female'
        }.svg`;
    }
    get photoAsAvatar() {
        return !!this.links.avatar?.includes('/photos/');
    }

    get totalNumberOfPhotos() {
        const hasAvatar = !!this.links.avatar?.includes('/avatars/');
        return this.photos.length + (hasAvatar ? 1 : 0);
    }

    get isSitlyAccount() {
        return !!this.email?.includes('@sitly.com');
    }

    get showAvailabilityDays() {
        return (
            !this.isParent ||
            !AvailabilityUtils.isEmpty(this.availability) ||
            this.searchPreferences.regularCare ||
            (!this.isAvailableAfterSchool && !this.isAvailableOccasionally)
        );
    }

    get mapInitialZoomLevel() {
        return this.meta?.zoomLevel ?? 13;
    }

    get intercomHmac() {
        return this.meta?.intercomHmac;
    }

    deepCopy() {
        return Object.assign(new User(), JSON.parse(JSON.stringify(this))) as User;
    }
}

export class User extends UserIncomplete {
    about: string;
    aTestVersion: boolean;
}
