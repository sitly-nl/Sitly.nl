import { Language } from 'app/models/api/language-interface';
import { MapBounds } from 'app/models/generic-types';
import { SubscriptionInterface } from 'app/models/api/subscription';
import { PaymentMethodType } from 'app/models/api/payment';
import { AppFeatures } from 'app/services/feature.service';
import { CountryCode } from 'app/models/api/country';
import { CouponInterface } from 'app/models/api/coupon-interface';

export interface AddressPropertyConfig {
    show: 'default' | 'inline' | 'separate-screen';
    editable: boolean;
    required: boolean;
}
export interface AddressComponentConfig {
    province?: AddressPropertyConfig;
    postalCode?: AddressPropertyConfig & { maskRegExp: string };
    city?: AddressPropertyConfig;
    street?: AddressPropertyConfig;
    buildingNumber?: AddressPropertyConfig;
}

export interface SocialPages {
    facebook: string;
    instagram: string;
    tiktok: string;
}

export interface CountrySettings {
    aboutChecks: {
        fake: string;
    };
    abPricingTestBabysitters?: string;
    abPricingTestParents?: string;
    addressComponents: AddressComponentConfig;
    adyenEncryptionUrl: string;
    androidSubscriptions?: string[];
    avatarExamplesUrls: string[];
    babysitterMinAge: number;
    countryCode: CountryCode;
    cdnUrl: string;
    childminderMinAge: number;
    contactUrl: string;
    countryBounds: MapBounds;
    countryWebAppUrl: string;
    currencyCode: string;
    defaultLocale: string;
    facebookAppId: number;
    findFosterGuideUrl: string;
    findParentGuideUrl: string;
    frontendUrl: string;
    hourlyRateMoneyFormat: string;
    hourlyRateOptions: HourlyRateOption[];
    invitesDailyLimit?: number;
    languageKnowledgeOptions: Language[];
    locales: LocaleInterface[];
    maxZoom: number;
    moneyFormat: string;
    nativeLanguageOptions: Language[];
    paymentMethodsAdyen: {
        paymentMethods: {
            type: PaymentMethodType;
            name: string;
        }[];
    };
    sharingMethods: ShareMethod[];
    showCertificateOfGoodBehavior: boolean;
    showChildminderLocationOptions: boolean;
    showChildminders: boolean;
    showMapBackend: boolean;
    showWelfareVouchers: boolean;
    socialPages: SocialPages;
    subscriptions: SubscriptionInterface[];
    coupons?: CouponInterface[];
    usePostalCodes: boolean;
    webAppFeatures: AppFeatures;
    winbackDiscountPercentage: number;
}

export interface LocaleInterface {
    localeCode: string;
    localeName: string;
}

export interface HourlyRateOption {
    value: string;
    label: string;
}

export enum ShareMethod {
    email = 'email',
    whatsapp = 'whatsapp',
    sms = 'sms',
    facebook = 'facebook-messenger',
    copy = 'copy',
}
