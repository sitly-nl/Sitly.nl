import { UserRole, OnlineStatus, Gender } from 'app/models/api/user';

export interface PaymentTrackingItem {
    id: string;
    amount: number;
}

export type GA4ElementAttr = {
    category: GA4ElementCategories;
    type: GA4ElementTypes;
    description: string;
    value?: string | number | boolean;
};

export type GA4UserActionAttr = {
    category: GA4ElementCategories;
    name: GA4EventAction;
    index: number;
};

export type GA4PaymentItem = {
    item_id: string;
    item_name: string;
    affiliation: 'Oudermatch';
    currency: string;
    item_category: string;
    price: number;
    quantity: number;
};

export type GA4PaymentAttr = {
    payment_status: PaymentStatus;
    transaction_id: string;
    affiliation: string;
    value: number;
    currency: string;
    items: GA4PaymentItem[];
    purchaseValue: number;
};

export type GTMPaymentAttr = {
    purchaseValue: number;
    orderId: string;
    transaction_id: string;
    affiliation: string;
    value: number;
    items: GA4PaymentItem[];
    itemsCount: number;
    currency: string;
    user_web_role: UserRole | undefined;
};

export interface TrackedUserProperties {
    user_web_role: UserRole;
    user_reg_state: UserRegistrationState;
    user_age: number;
    user_city: string;
    user_about_length: number;
    user_years_of_experience: string;
    user_age_group_experience: string;
    user_number_of_photos: number;
    user_id: string;
    user_gender: Gender;
    user_first_name: string;
    user_created_at: number;
    user_locale: string;
    user_email: string;
    user_hmac: string;
    user_premium_state: 'not_premium';
}

export interface FilterSelectedEventAttr {
    filter_name: string;
    filter_value: string;
}

export interface MapEngagementEventAttr {
    action_name: GA4EventAction;
    zoom_level?: number;
    total_area?: number;
    profile_distance?: number;
}

export type ProfileCardType = 'similar-user' | 'map-user' | 'search-user' | 'invites';
export interface UserProfileActionEventAttr extends Partial<UserProfileTrackingData> {
    index?: number;
    profile_card_type?: ProfileCardType;
    current_user_id: string;
    action_name: GA4EventAction;
}
export interface DataLayerDimensions
    extends TrackedUserProperties,
        GA4PaymentAttr,
        GTMPaymentAttr,
        UserProfileActionEventAttr,
        FilterSelectedEventAttr,
        MapEngagementEventAttr {
    event: string;
    currencyCode: string;
    purchaseValue: number;
    orderId: string;
    user_web_role: UserRole;
    userEmailSha256?: string;
    sitlyEnvironment?: string;
    brand_code?: string;
    sitly_platform: 'android-app' | 'web-app' | 'installed-pwa';
    isPremium: boolean;
    screen_name: string;
    element_category: GA4ElementCategories;
    element_type: GA4ElementTypes;
    element_description: string;
    action_name: Partial<GA4EventAction>;
    action_category: GA4ElementCategories | undefined;
    track_label: string;
    time_in_seconds: number;
    total_results: string;
    filters_selected: string;
    number_of_applied_filters: number;
    sort_type: string;
    action_index: number;
    current_user_id: string;
    is_first_time: boolean;
    number_of_items: number;
    page_path: string;
    sitly_device: 'desktop' | 'mobile';
    experiment_user: string;
    experiment_key: string;
    experiment_variation_id: number;
    user_api_abtest_version: string;
}

export type GA4ElementTypes =
    | 'button'
    | 'toggle'
    | 'select'
    | 'cta'
    | 'miss'
    | 'input'
    | 'input-text'
    | 'input-file'
    | 'overlay'
    | 'prompt'
    | 'filter';

export type PaymentStatus = 'normal' | 'pending' | 'pending-timeout' | 'paid' | 'unpaid' | 'monthly-failed';

export type UserRegistrationState = 'unregistered' | 'started' | 'registered' | 'premium' | 'canceled_premium' | 'deleted' | 'hidden';

export type GA4ElementCategories =
    | 'premium'
    | 'search'
    | 'toolbar'
    | 'profile'
    | 'registration'
    | 'invites'
    | 'N/A'
    | 'email'
    | 'facebook'
    | 'google'
    | 'apple';

export enum PromptEvents {
    avatarReminderPrompt = 'avatar_reminder_prompt',
    avatarReminderUploadPhotoButton = 'avatar_reminder_upload_photo_button',
    avatarReminderPhotoUploaded = 'avatar_reminder_photo_uploaded',
    availabilityReminderPrompt = 'availability_reminder_prompt',
    availabilityReminderAvailabilitySelection = 'availability_reminder_availability_selection',
    noAvailabilityConfirmationPrompt = 'no_availability_confirmation_prompt',
    noAvailabilityConfirmationAvailabilitySelection = 'no_availability_confirmation_availability_selection',
    reviewPrompt = 'review_prompt',
    reviewEnjoyingNotReally = 'review_enjoying_not_really',
    reviewEnjoyingYes = 'review_enjoying_yes',
    reviewEnjoyingYesNoThanks = 'review_enjoying_yes_no_thanks',
    reviewEnjoyingNotReallyNoThanks = 'review_enjoying_not_really_no_thanks',
    reviewEnjoyingYesSureEkomi = 'review_enjoying_yes_sure_ekomi',
    reviewEnjoyingYesSureTrustpilot = 'review_enjoying_yes_sure_trustpilot',
    reviewEnjoyingYesSureGooglePlay = 'review_enjoying_yes_sure_google_play',
    reviewEnjoyingYesSureGoogle = 'review_enjoying_yes_sure_google',
    reviewEnjoyingNotReallyFeedback = 'review_enjoying_not_really_feedback',
    recommendationPrompt = 'recommendation_prompt',
    recommendationBabysitBefore = 'recommendation-babysit_before',
    recommendationNotBabysitBefore = 'recommendation-not_babysit_before',
    recommendationBabysitBeforeLetsGo = 'recommendation-babysit_before-lets_go',
    recommendationSearchList = 'recommendation-search_list',
    recommendationMyProfile = 'recommendation-my_profile',
    recommendationProfileSettings = 'recommendation-profile_settings',
    recommendationAccount = 'recommendation-account',
    recommendationNotOnList = 'recommendation-not_on_list',
    recommendationSelectParent = 'recommendation-select_parent',
    recommendationParentFirstname = 'recommendation-parent_firstname',
    recommendationParentFirstnameSms = 'recommendation-parent_firstname-sms',
    recommendationParentFirstnameWhatsapp = 'recommendation-parent_firstname-whatsapp',
    recommendationParentFirstnameMessenger = 'recommendation-parent_firstname-messenger',
    recommendationParentFirstnameCopyMessage = 'recommendation-parent_firstname-copy_message',
    recommendationParentFirstnameViaSitly = 'recommendation-parent_firstname-via_sitly',
    recommendationParentFirstnameEmail = 'recommendation-parent_firstname-email',
    recommendationPromptFinalAskAnotherParent = 'recommendation_prompt-final-ask_another_parent',
    recommendationParentWhatsappMessengerSmsClose = 'recommendation-parent_firstname-whatsapp_messenger_sms-close',
    recommendationPromptFinal = 'recommendation_prompt-final',
    avatarScreeningPrompt = 'avatar_screening_prompt',
    avatarScreeningClose = 'avatar_screening_close',
    avatarScreeningChoseAnotherPhoto = 'avatar_screening_chose_another_photo',
    avatarScreeningUploadAnotherPhoto = 'avatar_screening_upload_another_photo',
}

export enum EventCategory {
    prompts = 'prompts',
    errorMessage = 'error-message',
    debugMessage = 'debug-message',
}

export enum EventAction {
    open = 'open',
    click = 'click',
    premiumSuccess = 'premium_success',
    shareProfile = 'share-profile',
    addToFavorite = 'add-to-favorite',
    mapView = 'map-view',
    searchListView = 'search-list-view',
    searchMapListView = 'search-map-list-view',
    filterSelection = 'filter-selection',
    myProfileMenu = 'my-profile-menu',
    messagesMenu = 'messages-menu',
    savedMenu = 'saved-menu',
    filterMenu = 'filter-menu',
    photoUpload = 'photo_upload',
    log = 'log',
}

export enum GtmEvents {
    applicationLoaded = 'applicationLoaded',
    codeClick = 'code_click',
    completeRegistration = 'completeRegistration',
    customPageView = 'custom_page_view',
    elementView = 'element_view',
    experimentViewed = 'experiment_viewed',
    filtersApplied = 'filters_applied',
    filterSelected = 'filter_selected',
    inviteSent = 'invite_sent',
    mapEngagement = 'map_engagement',
    paymentStatus = 'payment_status',
    premiumPurchase = 'premiumPurchase',
    registrationStarted = 'registration_started',
    searchUserProfiles = 'search_user_profiles',
    userAction = 'user_action',
    userApiAbtestVersionUpdated = 'user_api_abtest_version_updated',
    userFavorite = 'user_favorite',
    userLoaded = 'userLoaded',
    userLogin = 'user_login',
    userProfileAction = 'user_profile_action',
    userProperties = 'user_properties',
    userUploadedPhotos = 'user_uploaded_photos',
}

export interface UserProfileTrackingData {
    profile_id: string;
    profile_children_genders: string;
    profile_availability: string;
    profile_availability_days: string;
    profile_traits: string;
    profile_chores: string;
    profile_hourly_rate: string;
    profile_languages: string;
    profile_skills: string;
    profile_join_date: string;

    index?: number;
    profile_about_length: number;
    profile_ratings_count: number;
    profile_rating_score: number;
    profile_children_count: number;
    profile_photos_count: number;
    profile_years_of_experience?: number;
    profile_distance: number;

    profile_has_avatar: boolean;
    profile_has_references?: boolean;

    profile_role: UserRole;
    profile_reg_state: UserRegistrationState;
    profile_online_status: OnlineStatus;
    profile_gender: Gender;

    profile_card_type: ProfileCardType;
}

export enum GA4EventAction {
    // Photo Slider Interactions
    slideTap = 'slide_tap',
    slideDoubleTap = 'slide_double_tap',
    slideClick = 'slide_click',
    slideDoubleClick = 'slide_double_click',
    slideTouchTap = 'slide_touch_tap',
    slideSwipeNext = 'slide_swipe_next',
    slideSwipePrev = 'slide_swipe_prev',

    // Favorite Interactions
    addToFavorites = 'add_to_favorites',
    removeFromFavorites = 'remove_from_favorites',

    // Profile Interactions
    profileCardClick = 'profile_card_clicked',
    profileVisit = 'profile_visit',
    profileMessageClicked = 'profile_message_clicked',
    profileShareClicked = 'profile_share_clicked',
    profileReportClicked = 'profile_report_clicked',
    hideProfile = 'hide_profile',
    unHideProfile = 'unhide_profile',

    // Map Interactions
    zoomLevelChanged = 'zoom_level_changed',
    markerClicked = 'marker_clicked',

    // Invites interactions
    inviteSuccess = 'invite-success',
    inviteFail = 'invite-fail',
}

export class AttributesForProfileTracking {
    static readonly profilePageParent: (keyof UserProfileTrackingData)[] = [
        'profile_id',
        'profile_role',
        'profile_gender',
        'profile_online_status',
        'profile_reg_state',
        'profile_has_avatar',
        'profile_availability',
        'profile_availability_days',
        'profile_photos_count',
        'profile_about_length',
        'profile_distance',
        'profile_traits',
        'profile_chores',
        'profile_hourly_rate',
        'profile_languages',
        'profile_skills',
        'profile_join_date',
        'profile_children_count',
        'profile_children_genders',
    ];

    static readonly profilePageBabysitter: (keyof UserProfileTrackingData)[] = [
        'profile_id',
        'profile_role',
        'profile_gender',
        'profile_ratings_count',
        'profile_rating_score',
        'profile_online_status',
        'profile_reg_state',
        'profile_has_avatar',
        'profile_availability',
        'profile_availability_days',
        'profile_photos_count',
        'profile_about_length',
        'profile_distance',
        'profile_traits',
        'profile_years_of_experience',
        'profile_has_references',
        'profile_chores',
        'profile_hourly_rate',
        'profile_languages',
        'profile_skills',
        'profile_join_date',
    ];

    static readonly searchResultParent: (keyof UserProfileTrackingData)[] = [
        'profile_id',
        'profile_role',
        'profile_gender',
        'profile_online_status',
        'profile_reg_state',
        'profile_has_avatar',
        'profile_availability_days',
    ];

    static readonly searchResultBabysitter: (keyof UserProfileTrackingData)[] = [
        'profile_id',
        'profile_role',
        'profile_gender',
        'profile_ratings_count',
        'profile_rating_score',
        'profile_online_status',
        'profile_reg_state',
        'profile_has_avatar',
        'profile_availability_days',
    ];
}

export type EnhancedConversionAttr = {
    email: string;
    firstName: string;
    lastName: string;
    street: string;
    city: string;
    country: string;
};

export type DimensionRanges =
    | '0'
    | '1'
    | '2'
    | '3'
    | '4'
    | '5-9'
    | '10-14'
    | '15-19'
    | '20-24'
    | '25-49'
    | '50-99'
    | '100-249'
    | '250-499'
    | '500-999'
    | '1000+';

export const totalResultsRanges: DimensionRanges[] = [
    '0',
    '1',
    '2',
    '3',
    '4',
    '5-9',
    '10-14',
    '15-19',
    '20-24',
    '25-49',
    '50-99',
    '100-249',
    '250-499',
    '500-999',
    '1000+',
];
