import { Injectable, inject } from '@angular/core';
import { User, UserRole } from 'app/models/api/user';
import { RouteType } from 'routing/route-type';
import { SortType } from 'app/components/search/search-params';
import { FilterType } from 'app/components/search/filters/search-filters-types';
import { StorageService } from 'app/services/storage.service';
import { UserService } from 'app/services/user.service';
import { GoogleUADriver } from 'app/services/tracking/google-ua-driver';
import { GTMDriver } from 'app/services/tracking/gtm-driver';
import {
    EventAction,
    EventCategory,
    GA4ElementAttr,
    GA4UserActionAttr,
    PaymentStatus,
    GA4PaymentItem,
    ProfileCardType,
    GA4EventAction,
} from 'app/services/tracking/types';
import { EnvironmentService } from 'app/services/environment.service';
import { NavigationEnd, Router } from '@angular/router';
import { RouteService } from '../route.service';

@Injectable({
    providedIn: 'root',
})
export class TrackingService {
    private router = inject(Router);
    private userService = inject(UserService);
    private storageService = inject(StorageService);
    private routeService = inject(RouteService);
    private environmentService = inject(EnvironmentService);

    private _queue: (() => void)[] = [];
    private userDataUpdated = false;
    private gtmDriver: GTMDriver;

    get authUserId() {
        return this.userService?.authUser?.id;
    }

    constructor() {
        this.gtmDriver = new GTMDriver(this.environmentService);
        this.gtmDriver.applicationLoadedEvent();
        this.userService.changed.subscribe(_ => {
            if (this.userService.authUser) {
                this.trackUserUpdated(this.userService.authUser);
            }
        });

        let lastUrl: string;
        this.router.events.subscribe(event => {
            if (event instanceof NavigationEnd && event.url !== lastUrl) {
                this.trackCustomPageView(event.url);
                lastUrl = event.urlAfterRedirects;
            }
        });
    }

    trackUserUpdated(user: User) {
        this.gtmDriver.userUpdatedEvent(user);
    }

    trackUserLoaded(user: User) {
        if (this.userDataUpdated) {
            return;
        }
        GoogleUADriver.trackUserLoaded({ id: user.id, role: user.role, isPremium: user.isPremium });
        this.gtmDriver.userLoadedEvent(user).then(() => (this.userDataUpdated = true));
        this.sendQueue();
    }

    clearUser() {
        this.gtmDriver.clearUser();
        GoogleUADriver.clearUser();
    }

    setExperiment(experimentKey: string) {
        GoogleUADriver.setExperiment(experimentKey);
    }

    trackCustomPageView(url: string) {
        GoogleUADriver.trackPageView(url);
        if (url.includes('complete/start')) {
            return;
        }
        this.gtmDriver.customPageViewEvent();
    }

    trackCtaClick(label: string) {
        this.trackCtaEvent(label, EventAction.click);
    }

    trackPromptClickEvent(label: string) {
        this.trackEvent(EventCategory.prompts, EventAction.click, label);
    }

    trackCtaEvent(label: string, action: string) {
        GoogleUADriver.trackCtaEvent(label, action);
    }

    trackEvent(category: string, action: string, label: string) {
        GoogleUADriver.trackEvent(category, action, label);
    }

    trackPayment(orderId: string, subscriptionId: string, amount: number, productName: string, currencyCode: string) {
        const sku = `Premium ${subscriptionId}`;
        const category = `Premium ${this.userService.authUser?.role} Initial`;
        this.gtmDriver.addEnhancedConversionData(this.userService.authUser);
        GoogleUADriver.trackPayment({ orderId, amount, sku, category, productName });
        this.gtmDriver.premiumPurchaseEvent({
            purchaseValue: amount,
            orderId,
            transaction_id: orderId,
            affiliation: 'Oudermatch',
            value: amount,
            itemsCount: 1,
            currency: currencyCode,
            user_web_role: this.userService.authUser?.role,
            items: [
                {
                    item_id: sku,
                    item_name: productName,
                    affiliation: 'Oudermatch',
                    currency: currencyCode,
                    item_category: category,
                    price: amount,
                    quantity: 1,
                } as GA4PaymentItem,
            ],
        });
    }

    trackLogin() {
        if (!this.userService.authUser) {
            this.queue(() => this.trackLogin());
            return;
        }
        this.gtmDriver.userLoginEvent(this.userService.authUser);
    }

    trackRegistration() {
        if (!this.userService.authUser) {
            this.queue(() => this.trackRegistration());
            return;
        }
        this.gtmDriver.addEnhancedConversionData(this.userService.authUser);
        this.trackPhotoUploadEvent('photo-upload-reg-end', true);
        this.gtmDriver.completeRegistrationEvent(this.userService.authUser);
    }

    trackDisableAccount(isQR = false) {
        const premiumPostfix = this.userService.authUser?.isPremium ? 'premium' : 'nonpremium';
        const pageName = '/disable-account-' + (isQR ? 'qr-' : '') + premiumPostfix;
        this.trackCustomPageView(pageName);
    }

    trackPhotoUploadEvent(eventName: string, registrationEnd = false) {
        let prefix;
        switch (this.routeService.routeType()) {
            case RouteType.account:
                prefix = 'my-account';
                break;
            case RouteType.search:
                prefix = 'search-list';
                break;
            case RouteType.settings:
                prefix = 'my-profile';
                break;
            case RouteType.complete:
                if (!registrationEnd) {
                    return;
                }
                prefix = 'complete';
                break;
            default:
                prefix = 'N/A';
        }
        this.trackCtaEvent(`${prefix}_${eventName}`, EventAction.photoUpload);
        if (!this.userService.authUser?.photos?.length) {
            return;
        }
        if (registrationEnd) {
            this.gtmDriver.photoUploadEvent(registrationEnd, this.userService.authUser.photos.length);
        }
    }

    trackPhotoUploadGA4Event(previousNumberOfPhotos: number, currentNumberOfPhotos: number) {
        this.gtmDriver.photoUploadEvent(previousNumberOfPhotos === 0, currentNumberOfPhotos);
    }

    trackClickEvent(attr: GA4ElementAttr) {
        this.gtmDriver.clickEvent(attr);
    }

    trackElementView(attr: GA4ElementAttr) {
        this.gtmDriver.elementViewEvent(attr);
    }

    trackUserAction(attr: GA4UserActionAttr) {
        this.gtmDriver.userActionEvent(attr);
    }

    trackPaymentStatus(status: PaymentStatus) {
        const payClickTime = this.storageService.payButtonClickedAt ?? new Date();
        this.gtmDriver.paymentStatusEvent(status, payClickTime);
    }

    trackUserFavorite(profile: User, isFavorite: boolean, index?: number) {
        this.gtmDriver.userFavoriteEvent(this.authUserId, profile, isFavorite, index);
    }

    trackUserHide(profile: User, shouldHide: boolean, index?: number) {
        this.gtmDriver.userHideEvent(this.authUserId, profile, shouldHide, index);
    }

    trackUserProfileClicked(profile: User, cardType: ProfileCardType, index?: number) {
        this.gtmDriver.profileCardClickEvent(this.authUserId, profile, cardType, index);
    }

    trackUserProfileVisit(profile: User) {
        this.gtmDriver.profileVisitEvent(this.authUserId, profile);
    }

    trackUserProfileMessageClick(profile: User) {
        this.gtmDriver.profileMessageClickEvent(this.authUserId, profile);
    }

    trackUserProfileShareClick(profile: User) {
        this.gtmDriver.profileShareClickEvent(this.authUserId, profile);
    }

    trackUserProfileReportClick(profile: User) {
        this.gtmDriver.profileReportClickEvent(this.authUserId, profile);
    }

    trackMapZoomChanged(zoomLevel: number, totalAreaInSquareKm: number) {
        this.gtmDriver.mapZoomLevelChangedEvent(zoomLevel, totalAreaInSquareKm);
    }

    trackMapMarkerClicked(profileDistance: number) {
        this.gtmDriver.mapMarkerClickedEvent(profileDistance);
    }

    trackSearchResults(numberOfResults: number) {
        this.gtmDriver.searchUserProfilesEvent(numberOfResults);
    }

    trackPayClick(vendorName: string) {
        this.trackClickEvent({
            category: 'premium',
            type: 'button',
            description: `payment-method-pay-with-${vendorName}`,
        });
        this.storageService.payButtonClickedAt = new Date();
    }

    trackFiltersApplied(activeFilters: Map<FilterType, string | number | boolean>, sortType: SortType) {
        this.gtmDriver.filtersAppliedEvent(activeFilters, sortType);
    }

    trackExperimentViewed(experimentKey: string, variationId: number) {
        this.gtmDriver.experimentViewedEvent(this.authUserId ?? 'NA', experimentKey, variationId);
    }

    trackRegistrationStarted(userId: string) {
        if (!this.storageService.registrationUsersIds.includes(userId)) {
            this.gtmDriver.registrationStartedEvent(userId);
            this.storageService.addRegistrationUserId(userId);
        }
    }

    sendQueue() {
        for (const func of this._queue) {
            func.call(this);
        }
        this._queue = [];
    }

    trackInviteSent(receiverUserId: string, senderUserRole: UserRole | undefined, actionName: GA4EventAction) {
        this.gtmDriver.inviteSent(receiverUserId, senderUserRole, actionName);
    }

    private queue(func: () => void) {
        this._queue.push(func);
        if (this.userDataUpdated) {
            this.sendQueue();
        }
    }
}
