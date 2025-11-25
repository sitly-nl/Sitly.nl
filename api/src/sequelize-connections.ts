import { Sequelize, SequelizeOptions } from 'sequelize-typescript';
import { Availability } from './models/user/availability.model';
import { BrandCode } from './models/brand-code';
import { Child } from './models/child.model';
import { Country } from './models/gem/country.model';
import { CustomUser } from './models/user/custom-user.model';
import { Device } from './models/device.model';
import { Environment } from './services/env-settings.service';
import { ExternalServices } from './models/user/user-external-service.model';
import { Favorite } from './models/favorite.model';
import { Feedback } from './models/feedback.model';
import { FosterProperties } from './models/user/foster-properties.model';
import { FosterSearchPreferences } from './models/user/foster-search-preferences.model';
import { GemUser } from './models/gem/gem-user.model';
import { GemUserCountry } from './models/gem/gem-user-country.model';
import { GemUserLocale } from './models/gem/gem-user-locale.model';
import { JobPosting } from './models/job-posting.model';
import { UserAppleOrder } from './models/user-apple-order.model';
import { Locale } from './models/locale.model';
import { Message } from './models/message.model';
import { ParentSearchPreferences } from './models/user/parent-search-preferences.model';
import { Payment } from './models/payment.model';
import { Photo } from './models/photo.model';
import { Place } from './models/place.model';
import { Rating } from './models/cms/rating.model';
import { Recommendation } from './models/recommendation.model';
import { Reference } from './models/reference.model';
import { Subscription } from './models/subscription.model';
import { TranslationCode } from './models/translation/translation-code.model';
import { TranslationGroup } from './models/translation/translation-group.model';
import { TranslationValue } from './models/translation/translation-value.model';
import { User } from './models/user/user.model';
import { UserExclusion } from './models/user-exclusion.model';
import { UserWarning } from './models/user-warning.model';
import { WelfareCompany } from './models/welfare/welfare-company.model';
import { WelfareVoucher } from './models/welfare/welfare-voucher.model';
import { Province } from './models/province.model';
import { UserNotificationMatchGroup } from './models/matches/user-match-group.model';
import { UserNotificationMatch } from './models/matches/user-match.model';
import { Prompt } from './models/prompt.model';
import { UserCreationInfo } from './models/user/user-creation-info.model';
import { SensitivePhraseExclusion } from './models/sensitive-phrase-exclusion.model';
import { SensitivePhrase } from './models/sensitive-phrase.model';
import { UserCountry } from './models/user-country.model';
import { ConversationWrapperOld } from './models/conversation-old.model';
import { ConnectionInvite } from './models/connection-invite.model';
import { UserActivity } from './models/user-activity.model';
import { JobPostingUser } from './models/job-posting-user.model';
import { PostalCode } from './models/postal-code.model';
import { Setting } from './models/cms/setting.model';
import { CoreSetting } from './models/core-setting.model';
import { UserGoogleOrder } from './models/user-google-order.model';
import { Page, PageTranslation } from './models/cms/page.model';
import { ViewedProfiles } from './models/user/user-viewed-profiles.model';
import { NotificationSettings } from './models/user/notification-settings.model';
import { Coupon } from './models/coupon.model';
import { Conversation } from './models/conversation.model';
import { UserSearch } from './models/user/search/user-search.model';
import { UserSearchResult } from './models/user/search/user-search-result.model';

export const maxPageSize = 5_000;

export const mainModels = {
    Country,
    GemUser,
    GemUserCountry,
    GemUserLocale,
    Locale,
    Page,
    PageTranslation,
    UserAppleOrder,
    UserCountry,
    UserGoogleOrder,
};
export const getMainModels = () => getConnection(BrandCode.main).models as typeof mainModels;

export const countryModels = {
    Availability,
    Child,
    ConnectionInvite,
    Conversation,
    ConversationWrapperOld,
    CoreSetting,
    Coupon,
    CustomUser,
    Device,
    ExternalServices,
    Favorite,
    Feedback,
    FosterProperties,
    FosterSearchPreferences,
    JobPosting,
    JobPostingUser,
    Locale,
    Message,
    NotificationSettings,
    ParentSearchPreferences,
    Payment,
    Photo,
    Place,
    PostalCode,
    Prompt,
    Province,
    Rating,
    Recommendation,
    Reference,
    SensitivePhrase,
    SensitivePhraseExclusion,
    Setting,
    Subscription,
    User,
    UserActivity,
    UserCreationInfo,
    UserExclusion,
    UserNotificationMatch,
    UserNotificationMatchGroup,
    UserSearch,
    UserSearchResult,
    UserWarning,
    ViewedProfiles,
    WelfareCompany,
    WelfareVoucher,
};
export const getModels = (brandCode: BrandCode) => {
    return getConnection(brandCode).models as typeof countryModels;
};

export const translationModels = {
    TranslationGroup,
    TranslationCode,
    TranslationValue,
};
export const getTranslationModels = (testDBForApiTests = true) => {
    return getTranslationConnection(testDBForApiTests).models as typeof translationModels;
};
export const syncTranslationModels = async () => {
    return getTranslationConnection(true).sync({ alter: true });
};

// -------------- Internals -------------- //
const defaultConfig: SequelizeOptions = {
    repositoryMode: true,
    dialect: 'mariadb',
    logging: false,
    // logQueryParameters: true,
    benchmark: Environment.isTest,
    define: {
        timestamps: false,
    },
    dialectOptions: {
        connectTimeout: 6_000,
    },
};

const connections: Record<string, Sequelize> = {};

const getConnection = (brandCode: BrandCode) => {
    if (!connections[brandCode]) {
        let databaseSuffix: string;
        if (brandCode === BrandCode.main) {
            databaseSuffix = '';
        } else {
            databaseSuffix = `${Environment.isTest ? '_' : ''}${brandCode === BrandCode.xx ? 'xx_apitests' : brandCode}`;
        }
        let database: string;

        if (Environment.isProd) {
            database = `dboudermat_oudermatch${databaseSuffix}`;
        } else {
            database = `sitly_${brandCode === BrandCode.xx ? 'xx_apitests' : brandCode}`;
        }

        const credentials = Environment.apiKeys.database[brandCode];

        const sequelize = new Sequelize(database, credentials.user, credentials.password, {
            ...defaultConfig,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            host: Environment.settings.use_localhost_database ? '127.0.0.1' : Environment.apiKeys.database_host,
            models: Object.values(brandCode === BrandCode.main ? mainModels : countryModels),
        }) as Sequelize & { brandCode___: BrandCode };
        sequelize.brandCode___ = brandCode;
        connections[brandCode] = sequelize;
    }
    return connections[brandCode];
};

const getTranslationConnection = (testDBForApiTests: boolean) => {
    const connectionKey = Environment.isApiTests && testDBForApiTests ? 'translationApiTest' : 'translation';
    if (!connections[connectionKey]) {
        const database = `translations_db${Environment.isApiTests && testDBForApiTests ? '_api_tests' : ''}`;
        const credentials = Environment.apiKeys.database_translations;
        const sequelize = new Sequelize(database, credentials.user, credentials.password, {
            ...defaultConfig,
            host: credentials.host,
            models: Object.values(translationModels),
        });
        connections[connectionKey] = sequelize;
    }
    return connections[connectionKey];
};
