import { Injectable, inject } from '@angular/core';
import { User } from 'app/models/api/user';
import { MapCameraPosition } from 'app/components/search/map/mapbox-maps';
import { Prompt, PromptType } from 'app/models/api/prompt';
import { CountrySettings } from 'app/models/api/country-settings-interface';
import { AppEvent } from 'app/services/event.service';
import { SearchParams } from 'app/components/search/search-params';
import { SubscriptionInterface } from 'app/models/api/subscription';
import { GA4ElementCategories, PaymentTrackingItem } from 'app/services/tracking/types';
import { InstagramToken } from 'app/models/api/instagram-token';
import 'reflect-metadata';
import { NotificationPreferences } from 'app/models/api/notification-preferences';
import { CountryCode } from 'app/models/api/country';
import { CookieService } from 'app/services/cookie.service';

const localStorageMetaKey = 'localStorageMetaKey';

const buildDecorator = (attributes: (propertyName: string) => PropertyDescriptor) => {
    return (target: object, propertyName: string) => {
        const properties = (Reflect.getMetadata(localStorageMetaKey, target) ?? []) as string[];
        Reflect.defineMetadata(localStorageMetaKey, [...properties, propertyName], target);
        Object.defineProperty(target, propertyName, attributes(propertyName));
    };
};

const LocalStorageItem = () => {
    return buildDecorator(propertyName => {
        return {
            get: () => {
                return localStorage.getItem(propertyName) ?? undefined;
            },
            set: (value: string | undefined) => {
                if (value) {
                    localStorage.setItem(propertyName, value);
                } else {
                    localStorage.removeItem(propertyName);
                }
            },
        };
    });
};

const LocalStorageNumber = () => {
    return buildDecorator(propertyName => {
        return {
            get: () => {
                const value = parseInt(localStorage.getItem(propertyName) ?? '');
                return !isNaN(value) ? value : undefined;
            },
            set: (value: number) => {
                if (value) {
                    localStorage.setItem(propertyName, value.toString());
                } else {
                    localStorage.removeItem(propertyName);
                }
            },
        };
    });
};

const LocalStorageBoolean = () => {
    return buildDecorator(propertyName => {
        return {
            get: () => {
                return localStorage.getItem(propertyName) === 'true';
            },
            set: (value: boolean) => {
                if (value) {
                    localStorage.setItem(propertyName, 'true');
                } else {
                    localStorage.removeItem(propertyName);
                }
            },
        };
    });
};

const LocalStorageObject = (defaultValue?: unknown) => {
    return buildDecorator(propertyName => {
        return {
            get: () => {
                const item = localStorage.getItem(propertyName);
                return item ? (JSON.parse(item) as unknown) : defaultValue;
            },
            set: (value: object | undefined) => {
                if (value) {
                    localStorage.setItem(propertyName, JSON.stringify(value));
                } else {
                    localStorage.removeItem(propertyName);
                }
            },
        };
    });
};

const LocalStorageDate = () => {
    return buildDecorator(propertyName => {
        return {
            get: () => {
                const item = localStorage.getItem(propertyName);
                return item ? new Date(item) : undefined;
            },
            set: (value: Date | undefined) => {
                if (value) {
                    localStorage.setItem(propertyName, value?.toString());
                } else {
                    localStorage.removeItem(propertyName);
                }
            },
        };
    });
};

@Injectable({
    providedIn: 'root',
})
export class StorageService {
    cachedUsers: User[] = [];
    fieldsPopulatedFromQueryParams = ['sitlyAuthProvider', 'countryCode'] as const;

    private readonly cookieService = inject(CookieService);

    @LocalStorageItem() localeCode?: string;
    @LocalStorageItem() countryCode?: Uppercase<CountryCode>;
    @LocalStorageItem() token?: string;
    @LocalStorageItem() trackUrl?: string;
    @LocalStorageItem() platform?: 'web-app' | 'android-app';
    @LocalStorageItem() lastClickedInviteUserId?: string;
    @LocalStorageItem() sitlyAuthProvider?: GA4ElementCategories;

    @LocalStorageNumber() sentInvitesAmount?: number;

    @LocalStorageBoolean() reEnabled: boolean;
    @LocalStorageBoolean() showPhotoUploadSuccessOverlay: boolean;
    @LocalStorageBoolean() restoringRecurringPayment: boolean;
    @LocalStorageBoolean() processingPayment: boolean;
    @LocalStorageBoolean() combinedSearchTracked: boolean;
    @LocalStorageBoolean() searchListTracked: boolean;
    @LocalStorageBoolean() mapSearchTracked: boolean;
    @LocalStorageBoolean() invitesNoteHidden: boolean;
    @LocalStorageBoolean() invitesStepsShown: boolean;
    @LocalStorageBoolean() invitesTooltipShown: boolean;
    @LocalStorageBoolean() invitesSurveyShown: boolean;
    @LocalStorageBoolean() recommendationsTooltipShown: boolean;

    @LocalStorageObject() authUser?: object;
    @LocalStorageObject() countrySettings?: CountrySettings; // should be used only by CountrySettingsService
    @LocalStorageObject() messageInputCache?: Record<string, MessageInputCacheEntry>;
    @LocalStorageObject() instagramAuthToken?: InstagramToken;
    @LocalStorageObject() filters?: SearchParams;
    @LocalStorageObject() subscription?: SubscriptionInterface;
    @LocalStorageObject() payment?: PaymentTrackingItem;
    @LocalStorageObject() lastMapCameraPosition?: MapCameraPosition;
    @LocalStorageObject() notificationPreferences?: NotificationPreferences;
    @LocalStorageObject([]) hiddenUsers: object[];
    @LocalStorageObject([]) reportedFromChatUserIds: string[];
    @LocalStorageObject([]) eventQueue: AppEvent[];
    @LocalStorageObject([]) registrationUsersIds: string[];
    @LocalStorageObject([]) private promptsQueue: Prompt[];

    @LocalStorageDate() lastRecommendationRequestTime?: Date;
    @LocalStorageDate() lastSearchTrackingTime?: Date;
    @LocalStorageDate() fullResponserRateAchievedAt?: Date;
    @LocalStorageDate() payButtonClickedAt?: Date;
    @LocalStorageDate() fifthInviteViewedTime?: Date;
    @LocalStorageDate() fifthInviteSentTime?: Date;

    constructor() {
        this.populateFromCookies();
    }

    // -- Events -- //
    pushToEventQueue(event: AppEvent) {
        const eventsQueue = this.eventQueue;
        eventsQueue.push(event);
        this.eventQueue = eventsQueue;
    }

    // -- Prompts -- //
    getFirstPrompt() {
        return this.promptsQueue?.[0];
    }

    clearPrompts() {
        this.promptsQueue = [];
    }

    pushPrompt(prompt: Prompt) {
        const promptsQueue = this.promptsQueue;
        promptsQueue.push(prompt);
        this.promptsQueue = promptsQueue;
    }

    unshiftPrompt(prompt: Prompt) {
        const promptsQueue = this.promptsQueue;
        promptsQueue.unshift(prompt);
        this.promptsQueue = promptsQueue;
    }

    removePromptsByType(promptType: PromptType) {
        this.promptsQueue = this.promptsQueue.filter(prompt => prompt.type !== promptType);
    }

    gaClientId() {
        const gaCookieValue = this.getValue('_ga') ?? this.cookieService.getCookieValue('_ga');
        const gaClientId = gaCookieValue?.split('.')?.slice(-2)?.join('.');
        if (!gaClientId || !/^\d+\.\d+$/.test(gaClientId)) {
            return;
        }
        return gaClientId;
    }

    private populateFromCookies() {
        const cookieMap = {
            authToken: 'token',
            reEnabled: 'reEnabled',
            countryCode: 'countryCode',
            sitlyAuthProvider: 'sitlyAuthProvider',
            _ga: '_ga',
        };

        for (const [cookieName, storageKey] of Object.entries(cookieMap)) {
            const cookieValue = this.cookieService.getCookieValue(cookieName);

            if (cookieValue) {
                this.setValue(storageKey, cookieValue);
            }
        }

        this.cookieService.deleteCookie('reEnabled');
        this.cookieService.deleteCookie('sitlyAuthProvider');
    }

    addRegistrationUserId(userId: string) {
        this.registrationUsersIds = [userId, ...this.registrationUsersIds];
    }

    clearStorage(extraKeptFields: string[] = []) {
        this.cachedUsers = [];

        const keptFields = [
            'localeCode',
            'platform',
            'invitesNoteHidden',
            'invitesStepsShown',
            'invitesTooltipShown',
            'recommendationsTooltipShown',
            ...extraKeptFields,
        ];
        const allFields = (Reflect.getMetadata(localStorageMetaKey, this) ?? []) as string[];
        allFields.filter(item => !keptFields.includes(item)).forEach(item => localStorage.removeItem(item));

        ['authToken', ...this.fieldsPopulatedFromQueryParams].forEach(item => this.cookieService.deleteCookie(item));
    }

    // -- Internal -- //
    private getValue(key: string) {
        return localStorage.getItem(key) ?? undefined;
    }
    private setValue(key: string, value: string | undefined) {
        if (value) {
            localStorage.setItem(key, value);
        } else {
            localStorage.removeItem(key);
        }
    }
}

export class MessageInputCacheEntry {
    text: string | undefined;
    time: Date;
}
