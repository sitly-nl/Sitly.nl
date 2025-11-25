import { Injectable, EventEmitter, inject } from '@angular/core';
import { ApiInterceptor, ApiService, ParamsMap } from 'app/services/api/api.service';
import { map, tap } from 'rxjs/operators';
import { User, UserRole, UserAvailabilityInterface, FosterProperties } from 'app/models/api/user';
import { ResponseParser } from 'app/parsers/response-parser';
import { PageMeta } from 'app/models/api/response';
import { SearchParams, SearchType } from 'app/components/search/search-params';
import { SearchParamsUtils } from 'app/components/search/search-params-utils';
import { StorageService } from 'app/services/storage.service';
import { UserGroup } from 'app/models/api/user-group';
import { AvailabilityUtils } from 'app/utils/availability-utils';
import { Photo } from 'app/models/api/photo';
import { HttpErrorResponse } from '@angular/common/http';
import { EnvironmentService } from 'app/services/environment.service';
import { CountryCode } from 'app/models/api/country';

export class UserAvailabilityUpdate {
    availability: UserAvailabilityInterface;
    availabilityAfterSchool?: boolean;
    availabilityOccasional?: boolean;
    hasRegularCare?: boolean;
}

export type UserUpdate = Partial<
    User &
        Omit<FosterProperties, 'nativeLanguage' | 'languages'> & {
            disabled?: 0 | 1;
            lookingForRegularCare: boolean;
            lookingForOccasionalCare: boolean;
            nativeLanguage: string;
            languages: string[];
            hourlyRatesPreference: string[];
            choresPreference: string[];
            maxChildren: number;
            activeCouponCode: string;
        }
>;

@Injectable({
    providedIn: 'root',
})
export class UserService {
    private apiService = inject(ApiService);
    private storageService = inject(StorageService);
    private environmentService = inject(EnvironmentService);

    readonly changed = new EventEmitter<void>();
    readonly changedWithPreviousUser = new EventEmitter<User | undefined>();
    private _authUser: User | undefined;

    get authUser() {
        return this._authUser;
    }

    set authUser(userData: User | undefined) {
        if (userData) {
            const previousUser = this._authUser;
            this._authUser = Object.assign(new User(), userData);
            this.storageService.authUser = userData;
            this.changed.emit();
            this.changedWithPreviousUser.emit(previousUser);
        } else {
            this._authUser = userData;
            this.storageService.authUser = undefined;
        }
    }

    constructor() {
        const localUser = this.storageService.authUser;
        if (localUser) {
            this._authUser = Object.assign(new User(), localUser);
        }
    }

    search(params: SearchParams) {
        return this.apiService
            .get('/users', {
                params: this.searchServerRepresentation(params),
                cachable: true,
            })
            .pipe(map(response => ResponseParser.parseObject<User[] | UserGroup[], PageMeta>(response)));
    }

    saveUser(user: UserUpdate) {
        return this.apiService
            .patch('/users/me?include=children,references,photos,recommendations', { body: user })
            .pipe(map(response => ResponseParser.parseObject<User>(response)))
            .pipe(
                tap(response => {
                    this.authUser = response.data;
                }),
            );
    }

    saveUserAvailability(availability: UserAvailabilityUpdate) {
        const postData: Record<string, unknown> = {};
        const isParent = this.authUser?.isParent;
        const availabilityKey = isParent ? 'availabilityPreference' : 'availability';
        postData[availabilityKey] = availability.availability;
        if (availability.availabilityOccasional !== null) {
            const occasionallyKey = isParent ? 'lookingForOccasionalCare' : 'isAvailableOccasionally';
            postData[occasionallyKey] = availability.availabilityOccasional;
        }
        if (availability.availabilityAfterSchool !== null) {
            const afterSchoolKey = isParent ? 'lookingForAfterSchool' : 'isAvailableAfterSchool';
            postData[afterSchoolKey] = availability.availabilityAfterSchool;
        }
        if (availability.hasRegularCare !== null) {
            const regularKey = isParent ? 'lookingForRegularCare' : 'isAvailableRegularly';
            postData[regularKey] = availability.hasRegularCare;
        }

        if (!isParent) {
            const isAvailable =
                !AvailabilityUtils.isEmpty(availability.availability) ||
                availability.availabilityOccasional ||
                availability.availabilityAfterSchool ||
                availability.hasRegularCare;
            postData.disabled = !isAvailable;
        }

        return this.saveUser(postData);
    }

    getUser(userId: string, includeInactive = false, waitForPremium = false) {
        let includeParam = 'children,references,photos,recommendations';
        includeParam +=
            userId === 'me' ? ',subscription' : this.authUser?.isParent ? ',similar-users.recommendations' : ',similar-users.children';
        const params = {
            include: includeParam,
            ...(this.authUser?.completed && userId !== 'me' ? { 'include-inactive': includeInactive ? 1 : 0 } : {}),
        };
        const gaClientId = this.storageService.gaClientId();
        return this.apiService
            .get(`/users/${userId}${waitForPremium ? '?waitForPremium=true' : ''}`, {
                params,
                ...(gaClientId ? { headers: { 'sitly-user-ga-client-id': gaClientId } } : {}),
            })
            .pipe(map(response => ResponseParser.parseObject<User>(response)));
    }

    deleteUser() {
        return this.apiService.delete('/users/me');
    }

    uploadAvatar(base64String: string, validate = false) {
        return this.apiService
            .patch('/users/me?include=children,references,photos,recommendations', {
                body: {
                    avatar: base64String,
                    validateAvatar: validate,
                },
            })
            .pipe(
                map(response => ResponseParser.parseObject<User>(response)),
                tap(response => (this.authUser = response.data)),
            );
    }

    cityRatesStatistic() {
        return this.apiService.get('/users/city-statistics', {
            params: {
                filter: {
                    place: this.authUser?.placeName ?? '',
                },
                type: this.authUser?.isChildminder ? 'childminders' : 'babysitters',
            },
        });
    }

    saveFCMToken(fcmToken: string) {
        return this.apiService.post('/users/me/devices', {
            body: {
                deviceType: this.environmentService.isAndroidApp ? 'android' : 'web',
                fcmToken,
            },
        });
    }

    aboutSuggestion() {
        return this.apiService.get<string>('/users/me/about-suggestion');
    }

    refreshAuthUser(waitForPremium = false) {
        return this.getUser('me', false, waitForPremium).pipe(
            tap(
                response => {
                    this.authUser = response.data;
                },
                (err: HttpErrorResponse) => {
                    if (err.status >= 400 && err.status < 500) {
                        console.error('user fetch error: ', err, 'logging out...');
                        ApiInterceptor.onUnauthorized.emit();
                    }
                },
            ),
        );
    }

    createUser(
        userData:
            | { email: string; firstName: string; lastName: string; password: string }
            | { googleAuthToken: string }
            | { facebookAccessToken: string; email?: string },
        countryCode: CountryCode,
    ) {
        return this.apiService.post('/users', { body: userData, brandCode: countryCode }).pipe(
            map(response => ResponseParser.parseObject<User, { accessToken: string }>(response)),
            tap(response => (this.authUser = response.data)),
        );
    }

    addAuthUserPhoto(photo: Photo) {
        this.authUser?.photos.push(photo);
        this.changed.emit();
    }

    // ---- Helpers ---- //
    private searchServerRepresentation(searchParams: SearchParams) {
        const filters: Record<string, unknown> = {
            'role': [searchParams.role],
            'maxNumberOfChildren': searchParams.childrenAmount ? searchParams.childrenAmount : undefined,
            'ageOfChildren': SearchParamsUtils.getFormattedAgeOfChildren(searchParams),
            'availability': SearchParamsUtils.getAvailabilityValue(searchParams),
            'isEducated': searchParams.role === UserRole.childminder && searchParams.isEducated ? true : undefined,
            'isExperienced': searchParams.isExperienced ? true : undefined,
            'hasReferences': searchParams.hasReferences ? true : undefined,
            'isSmoker': searchParams.isNonSmoker ? 0 : undefined,
            'averageHourlyRate': SearchParamsUtils.getFormattedHourlyRates(searchParams),
            'gender': SearchParamsUtils.getFormattedGender(searchParams),
            'languages': SearchParamsUtils.getFormattedLanguages(searchParams),
            'fosterLocation': SearchParamsUtils.getFormattedFosterLocation(searchParams),
            'fosterChores': SearchParamsUtils.getFormattedFosterChores(searchParams),
            'minAge': SearchParamsUtils.getMinAge(searchParams),
            'maxAge': SearchParamsUtils.getMaxAge(searchParams),
            'nativeLanguage': searchParams.nativeLanguage ? searchParams.nativeLanguage : undefined,
            'distance': SearchParamsUtils.getDistance(searchParams),
            'ageGroupExperience': SearchParamsUtils.getFormattedAgeGroupExperience(searchParams),
            'active-after': searchParams.lastSeenOnline ? SearchParamsUtils.getFormattedLastSeenOnlineValue(searchParams) : null,
        };

        if (searchParams.bounds) {
            filters.bounds = searchParams.bounds;
        } else if (this.storageService.lastMapCameraPosition) {
            filters.center = {
                latitude: this.storageService.lastMapCameraPosition.center.lat,
                longitude: this.storageService.lastMapCameraPosition.center.lng,
            };
        }

        if (searchParams.hasOccasionalCare && searchParams.showOccasionalCare) {
            if (searchParams.role === UserRole.parent) {
                filters.lookingForOccasionalCare = true;
            } else {
                filters.isAvailableOccasionally = true;
            }
        }
        if (searchParams.hasRegularCare && searchParams.showRegularCare) {
            if (searchParams.role === UserRole.parent) {
                filters.lookingForRegularCare = true;
            } else {
                filters.isAvailableRegularly = true;
            }
        }
        if (searchParams.hasAfterSchool) {
            if (searchParams.role === UserRole.parent) {
                filters.lookingForAfterSchool = true;
            } else {
                filters.isAvailableAfterSchool = true;
            }
        }

        return {
            group: searchParams.searchType === SearchType.map ? 1 : null,
            sort: [searchParams.sort],
            include: searchParams.include,
            filter: filters,
            page: {
                number: SearchParamsUtils.getPage(searchParams),
                size: searchParams.pageSize,
            },
        } as ParamsMap;
    }
}
