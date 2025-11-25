import { User, UserRole } from 'app/models/api/user';
import { SortType } from 'app/components/search/search-params';
import { FilterType } from 'app/components/search/filters/search-filters-types';
import { TrackingUtils } from 'app/services/tracking/tracking-utils';
import {
    DataLayerDimensions,
    TrackedUserProperties,
    GA4ElementAttr,
    GA4UserActionAttr,
    PaymentStatus,
    GA4EventAction,
    GtmEvents,
    GTMPaymentAttr,
    ProfileCardType,
    UserProfileActionEventAttr,
    totalResultsRanges,
} from 'app/services/tracking/types';
import { TrackLabelDirective } from 'modules/shared/directives/track-label.directive';
import { EnvironmentUtils } from 'app/utils/device-utils';
import { EnvironmentService } from 'app/services/environment.service';
import { CountrySettingsService } from 'app/services/country-settings.service';
import { inject } from '@angular/core';
import { StorageService } from 'app/services/storage.service';

export class GTMDriver {
    private dataLayer: Partial<DataLayerDimensions>[] = [];
    private dataLayerQueue: Partial<DataLayerDimensions>[] = [];
    private userDataUpdated = false;

    readonly countrySettingsService = inject(CountrySettingsService);
    readonly storageService = inject(StorageService);

    constructor(environmentService: EnvironmentService) {
        window.dataLayer = window.dataLayer ?? [];
        window.dataLayer.push({ sitly_device: EnvironmentUtils.isDesktop() ? 'desktop' : 'mobile' });
        window.dataLayer.push({ brand_code: this.storageService.countryCode?.toLocaleLowerCase() ?? 'NA' });
        window.dataLayer.push({ sitly_platform: environmentService.trackingPlatform });
        this.dataLayer = window.dataLayer;

        this.countrySettingsService.changed.subscribe(_ => {
            if (this.countrySettingsService.countrySettings?.countryCode) {
                this.pushToDataLayer({ brand_code: this.countrySettingsService.countrySettings.countryCode });
            }
        });
    }

    clearUser() {
        this.pushToDataLayer({
            user_web_role: undefined,
            user_id: undefined,
        });
    }

    applicationLoadedEvent() {
        this.pushToDataLayer({ event: GtmEvents.applicationLoaded }, true);
    }

    userUpdatedEvent(user: User) {
        this.updateUserDimensions(user);
        this.userAbVersionUpdated(user.aTestVersion);
    }

    private updateUserDimensions(user: User) {
        const ageGroupExperience = Object.entries(user.fosterProperties?.ageGroupExperience ?? {})
            .filter(([_ageRange, isSelected]) => isSelected)
            .map(([ageRange, _isSelected]) => ageRange)
            .join(',');

        this.trackUserDimensions({
            user_id: user.id,
            user_web_role: user.role,
            user_reg_state: user.completed ? (user.isPremium ? 'premium' : 'registered') : 'started',
            user_age: user.age || undefined,
            user_city: user.placeName,
            user_about_length: user.about?.length,
            user_number_of_photos: user.totalNumberOfPhotos,
            user_years_of_experience: user.fosterProperties?.yearsOfExperience,
            user_age_group_experience: ageGroupExperience,
            user_gender: user.gender,
            user_first_name: user.firstName,
            user_created_at: Math.floor(new Date(user.created).getTime() / 1000),
            user_locale: user.localeCode,
            user_email: user.email,
            user_hmac: user.intercomHmac,
        });
    }

    async userLoadedEvent(user: User) {
        this.updateUserDimensions(user);
        this.pushToDataLayer(
            {
                userEmailSha256: user.email ? await TrackingUtils.sha256Email(user.email) : undefined,
                isPremium: user.isPremium,
                event: GtmEvents.userLoaded,
            },
            true,
        );
        this.userDataUpdated = true;
        this.processGtmQueue();
    }

    pushToDataLayer(properties: Partial<DataLayerDimensions>, skipQueue = false) {
        const layer = this.userDataUpdated || skipQueue ? this.dataLayer : this.dataLayerQueue;
        layer.push(properties);
    }

    customPageViewEvent() {
        this.trackGtmEvent(GtmEvents.customPageView);
    }

    userLoginEvent(user: User) {
        if (!this.storageService.sitlyAuthProvider) {
            return;
        }
        this.trackGtmEvent(GtmEvents.userLogin, {
            user_web_role: user.role,
            user_id: user.id,
            action_category: this.storageService.sitlyAuthProvider,
        });
        this.storageService.sitlyAuthProvider = undefined;
    }

    premiumPurchaseEvent(attr: GTMPaymentAttr) {
        this.trackGtmEvent(GtmEvents.premiumPurchase, {
            ...attr,
        });
    }

    completeRegistrationEvent(user: User) {
        this.trackGtmEvent(GtmEvents.completeRegistration, {
            user_web_role: user.role,
            user_id: user.id,
            user_premium_state: 'not_premium',
            action_category: this.storageService.sitlyAuthProvider,
        });
        this.storageService.sitlyAuthProvider = undefined;
    }

    addEnhancedConversionData(user?: User) {
        if (!this.countrySettingsService.countrySettings?.countryCode || !user) {
            return;
        }
        TrackingUtils.addEnhancedConversionData({
            email: user.email ?? '',
            firstName: user.firstName,
            lastName: user.lastName,
            street: user.streetName,
            city: user.placeName,
            country: this.countrySettingsService.countrySettings.countryCode,
        });
    }

    clickEvent(attr: GA4ElementAttr) {
        this.trackGtmEvent(GtmEvents.codeClick, {
            track_label: TrackLabelDirective.createTrackLabel(attr),
        });
    }

    elementViewEvent({ category, type, description }: GA4ElementAttr) {
        this.trackGtmEvent(GtmEvents.elementView, {
            element_category: category,
            element_type: type,
            element_description: description,
        });
    }

    paymentStatusEvent(status: PaymentStatus, clickedAt: Date) {
        const now = new Date();
        const seconds = (now.getTime() - clickedAt.getTime()) / 1000;
        this.trackGtmEvent(GtmEvents.paymentStatus, {
            payment_status: status,
            time_in_seconds: seconds,
        });
    }

    userActionEvent({ name, category, index }: GA4UserActionAttr) {
        this.trackGtmEvent(GtmEvents.userAction, {
            action_name: name,
            action_category: category,
            action_index: index,
        });
    }

    userFavoriteEvent(currentUserId: string | undefined, profile: User, isFavorite: boolean, index = -1) {
        this.trackUserProfileActionEvent(profile, true, {
            index,
            current_user_id: currentUserId ?? 'NA',
            action_name: isFavorite ? GA4EventAction.removeFromFavorites : GA4EventAction.addToFavorites,
        });
    }

    userHideEvent(currentUserId: string | undefined, profile: User, shouldHide: boolean, index = -1) {
        this.trackUserProfileActionEvent(profile, true, {
            index,
            current_user_id: currentUserId ?? 'NA',
            action_name: shouldHide ? GA4EventAction.hideProfile : GA4EventAction.unHideProfile,
        });
    }

    profileCardClickEvent(currentUserId: string | undefined, profile: User, cardType: ProfileCardType, index = -1) {
        this.trackUserProfileActionEvent(profile, true, {
            index,
            current_user_id: currentUserId ?? 'NA',
            action_name: GA4EventAction.profileCardClick,
            profile_card_type: cardType,
        });
    }

    profileVisitEvent(currentUserId: string | undefined, profile: User) {
        this.trackUserProfileActionEvent(profile, true, {
            current_user_id: currentUserId ?? 'NA',
            action_name: GA4EventAction.profileVisit,
        });
    }

    profileMessageClickEvent(currentUserId: string | undefined, profile: User) {
        this.trackUserProfileActionEvent(profile, true, {
            current_user_id: currentUserId ?? 'NA',
            action_name: GA4EventAction.profileMessageClicked,
        });
    }

    profileShareClickEvent(currentUserId: string | undefined, profile: User) {
        this.trackUserProfileActionEvent(profile, true, {
            current_user_id: currentUserId ?? 'NA',
            action_name: GA4EventAction.profileShareClicked,
        });
    }

    profileReportClickEvent(currentUserId: string | undefined, profile: User) {
        this.trackUserProfileActionEvent(profile, true, {
            current_user_id: currentUserId ?? 'NA',
            action_name: GA4EventAction.profileReportClicked,
        });
    }

    mapZoomLevelChangedEvent(zoomLevel: number, totalAreaInSquareKm: number) {
        const zoomRoundedTo1Decimal = Math.round(zoomLevel * 10) / 10;
        this.trackGtmEvent(GtmEvents.mapEngagement, {
            action_name: GA4EventAction.zoomLevelChanged,
            zoom_level: zoomRoundedTo1Decimal,
            total_area: totalAreaInSquareKm,
        });
    }

    mapMarkerClickedEvent(profileDistance: number) {
        this.trackGtmEvent(GtmEvents.mapEngagement, {
            action_name: GA4EventAction.markerClicked,
            profile_distance: profileDistance,
        });
    }

    searchUserProfilesEvent(numberOfResults: number) {
        this.trackGtmEvent(GtmEvents.searchUserProfiles, {
            total_results: TrackingUtils.roundNumberByScale(numberOfResults, totalResultsRanges),
        });
    }

    filtersAppliedEvent(activeFilters: Map<FilterType, string | number | boolean>, sortType: SortType) {
        activeFilters.forEach((value, key) => {
            this.trackFilterSelected(key, `${value}`);
        });
        this.trackGtmEvent(GtmEvents.filtersApplied, {
            filters_selected: Array.from(activeFilters.keys())
                .sort((a, b) => a.localeCompare(b))
                .join(','),
            number_of_applied_filters: activeFilters.size,
            sort_type: sortType,
        });
    }

    photoUploadEvent(isFirstPhotoUpload: boolean, currentNumberOfPhotos: number) {
        this.trackUserDimensions({ user_number_of_photos: currentNumberOfPhotos });
        this.trackGtmEvent(GtmEvents.userUploadedPhotos, {
            is_first_time: isFirstPhotoUpload,
            number_of_items: currentNumberOfPhotos,
        });
    }

    experimentViewedEvent(userId: string, experimentKey: string, experimentVariationId: number) {
        this.trackGtmEvent(GtmEvents.experimentViewed, {
            experiment_user: userId,
            experiment_key: experimentKey,
            experiment_variation_id: experimentVariationId,
        });
    }

    registrationStartedEvent(userId: string) {
        this.pushToDataLayer({
            event: GtmEvents.registrationStarted,
            user_reg_state: 'started',
            user_id: userId,
            action_category: this.storageService.sitlyAuthProvider,
        });
    }

    userAbVersionUpdated(isAVersion: boolean) {
        this.pushToDataLayer({
            event: GtmEvents.userApiAbtestVersionUpdated,
            user_api_abtest_version: isAVersion ? 'A' : 'B',
        });
    }

    inviteSent(receiverUserId: string | undefined, senderUserRole: UserRole | undefined, actionName: GA4EventAction) {
        this.pushToDataLayer({
            event: GtmEvents.inviteSent,
            profile_id: receiverUserId,
            user_web_role: senderUserRole,
            action_name: actionName,
        });
    }

    private trackFilterSelected(filterName: string, filterValue: string) {
        this.pushToDataLayer({
            event: GtmEvents.filterSelected,
            filter_name: filterName,
            filter_value: filterValue,
        });
    }

    private trackUserProfileActionEvent(profile: User, isProfilePage: boolean, attr: UserProfileActionEventAttr) {
        const profileTrackingData = TrackingUtils.getUserProfileTrackingData(profile, isProfilePage);
        this.trackGtmEvent(GtmEvents.userProfileAction, {
            ...attr,
            ...profileTrackingData,
        });
    }

    private trackUserDimensions(userData: Partial<TrackedUserProperties>) {
        this.trackGtmEvent(GtmEvents.userProperties, userData);
    }

    private trackGtmEvent(eventName: GtmEvents, attr?: Partial<DataLayerDimensions>) {
        console.log(eventName);
        this.pushToDataLayer({
            event: eventName,
            ...attr,
        });
    }

    private processGtmQueue() {
        this.dataLayerQueue.forEach(dataLayerEvent => this.dataLayer.push(dataLayerEvent));
        this.dataLayerQueue = [];
    }
}
