import { SearchParamsOptions, LastSeenOnline } from 'app/components/search/search-params-options';
import { ParentSearchPreferencesInterface, User, UserRole, Gender, UserAvailabilityInterface } from 'app/models/api/user';
import { StorageService } from 'app/services/storage.service';
import { AvailabilityUtils, WeekDay } from 'app/utils/availability-utils';
import { CountrySettings, HourlyRateOption } from 'app/models/api/country-settings-interface';
import { Language } from 'app/models/api/language-interface';
import { MapBounds } from 'app/models/generic-types';

export interface SortOption {
    value: SortType;
    label: string;
}
export interface AgeGroupExperienceOption {
    key: string;
    label: string;
    value: boolean;
}

export enum SortType {
    distance = 'distance',
    recentActivity = 'recent-activity',
    created = 'created',
    relevance = 'relevance',
}

export enum SearchType {
    photo = 'photo',
    map = 'map',
    photoAndMap = 'photo-and-map',
}

export class SearchParams {
    static readonly resetDuration = 24 * 60 * 60 * 1000; // 1 day
    readonly defaultLastSeenOnline = LastSeenOnline.anytime;

    readonly version = 3;
    include: string;
    sort: SortType;
    page = 1;
    bounds?: MapBounds;
    role: UserRole;
    maxDistance: number;
    childrenAmount = '';
    childrenMinAge = 0;
    childrenMaxAge = 15;
    hourlyRates: Record<string, string> = {};
    languageKnowledge: Record<string, boolean> = {};
    isEducated: boolean;
    isExperienced: boolean;
    hasAfterSchool?: boolean;
    hasOccasionalCare = true;
    hasRegularCare = true;
    hasReferences: boolean;
    isNonSmoker: boolean;
    nativeLanguage = '';
    lastSeenOnline = this.defaultLastSeenOnline;
    availabilityObject: UserAvailabilityInterface;
    genders = {
        f: false,
        m: false,
    };
    fosterLocation = {
        receive: false,
        visit: false,
    };
    fosterChores: Record<string, boolean> = {
        homework: false,
        shopping: false,
        cooking: false,
        driving: false,
        chores: false,
    };
    age = {
        min: 14,
        max: 70,
    };
    ageGroups: Record<string, string> = {};
    ageGroupExperienceOptions: AgeGroupExperienceOption[] = [
        { key: '0', label: '< 1', value: false },
        { key: '1-3', label: '1 - 3', value: false },
        { key: '4-6', label: '4 - 6', value: false },
        { key: '7-11', label: '7 - 11', value: false },
        { key: '12plus', label: '> 11', value: false },
    ];
    lastUpdated = new Date().getTime();
    get fosterChoresKeys() {
        return Object.keys(this.fosterChores);
    }
    get pageSize() {
        switch (this.searchType) {
            case SearchType.photo:
                return 20;
            case SearchType.photoAndMap:
                return 100;
            default:
                return undefined;
        }
    }
    get showRegularCare() {
        return this.role === UserRole.babysitter || this.isBabysitter;
    }
    get showOccasionalCare() {
        return this.showRegularCare;
    }
    get additionalAvailabilityCount() {
        return [this.hasRegularCare && this.showRegularCare, this.hasOccasionalCare && this.showOccasionalCare, this.hasAfterSchool].reduce(
            (count, value) => (value ? count + 1 : count),
            0,
        );
    }
    get searchType() {
        return this._searchType;
    }
    set searchType(value: SearchType) {
        this._searchType = value;
        this.refreshSort();
    }

    options = new SearchParamsOptions();

    availableUserTypes: UserRole[] = [];
    hourlyRateOptions: HourlyRateOption[];
    languageOptions: Language[] = [];
    nativeLanguageOptions: Language[] = [];
    sortOptions: SortOption[] = [];

    private isBabysitter: boolean;
    private _searchType: SearchType;

    static restoredIfNeeds(user: User, countrySettings: CountrySettings, storageService: StorageService, forced = false) {
        let searchParams = new SearchParams();

        let restored = false;
        const oldSearchParams = storageService.filters;
        if (oldSearchParams && oldSearchParams.version === searchParams.version) {
            const previousIsValid =
                oldSearchParams.lastUpdated && oldSearchParams.lastUpdated > new Date().getTime() - SearchParams.resetDuration;
            if (previousIsValid || forced) {
                oldSearchParams.options = new SearchParamsOptions();
                searchParams = Object.assign(searchParams, oldSearchParams);
                searchParams.page = 1;
                restored = true;
            }
            if (forced) {
                searchParams.lastUpdated = new Date().getTime();
            }
        }

        if (restored) {
            searchParams.populateWithCountrySettings(countrySettings);
        } else {
            searchParams.populate(user, countrySettings);
        }

        searchParams.bounds = undefined; // it should always populates from map

        return searchParams;
    }

    cleaned(user: User, countrySettings: CountrySettings) {
        const searchParams = new SearchParams();
        searchParams.populate(user, countrySettings);

        searchParams.searchType = this.searchType;
        searchParams.role = this.role;
        searchParams.bounds = this.bounds;
        searchParams.languageKnowledge = {};
        searchParams.genders.f = false;
        searchParams.genders.m = false;

        return searchParams;
    }

    private populateWithCountrySettings(countrySettings: CountrySettings) {
        this.languageOptions = countrySettings.languageKnowledgeOptions;
        this.nativeLanguageOptions = countrySettings.nativeLanguageOptions;
        this.hourlyRateOptions = countrySettings.hourlyRateOptions;
        this.options.babysitterAge.min = countrySettings.babysitterMinAge;
    }

    populate(user: User, countrySettings: CountrySettings) {
        this.populateWithCountrySettings(countrySettings);

        this.maxDistance = user.searchPreferences.maxDistance;
        this.isBabysitter = user.isBabysitter;
        this.availabilityObject = JSON.parse(JSON.stringify(user.availability)) as UserAvailabilityInterface;

        // populate search filters with default values if it's empty
        if (user.isParent) {
            const parentSearchPreferences: ParentSearchPreferencesInterface = user.searchPreferences;
            const showChildminders = countrySettings?.showChildminders;
            this.include = 'recommendations';

            this.availableUserTypes = [UserRole.babysitter];
            if (showChildminders) {
                this.availableUserTypes.push(UserRole.childminder);
            }
            if (this.role !== UserRole.babysitter && this.role !== UserRole.childminder) {
                if (parentSearchPreferences.babysitters) {
                    this.role = UserRole.babysitter;
                } else {
                    this.role = showChildminders && parentSearchPreferences.childminders ? UserRole.childminder : UserRole.babysitter;
                }
            }

            this.hasAfterSchool = parentSearchPreferences.afterSchool;

            if (user.searchPreferences.languages?.length) {
                user.searchPreferences.languages.forEach(language => {
                    this.languageKnowledge[language.code] = true;
                });
            }
            if (user.searchPreferences.gender) {
                this.genders[user.searchPreferences.gender === Gender.male ? 'm' : 'f'] = true;
            }
        } else {
            this.availableUserTypes = [UserRole.parent];
            this.role = UserRole.parent;
            this.include = 'children';

            if (!this.childrenMinAge) {
                this.childrenMinAge = user.searchPreferences.age?.min;
            }
            if (this.childrenMinAge < 0) {
                this.childrenMinAge = 0;
            }

            if (!this.childrenMaxAge) {
                this.childrenMaxAge = user.searchPreferences.age?.max;
            }
            if (this.childrenMaxAge <= this.childrenMinAge) {
                this.childrenMaxAge = this.childrenMinAge + 1;
            }
        }

        this.refreshSort();
    }

    isWholeDayChecked(day: WeekDay) {
        return AvailabilityUtils.isWholeDayChecked(this.availabilityObject, day);
    }

    toggleWholeDay(day: WeekDay) {
        AvailabilityUtils.toggleWholeDay(this.availabilityObject, day);
    }

    getFosterChoresCount() {
        return Object.values(this.fosterChores).filter(item => item).length;
    }

    getLanguagesCount() {
        return Object.values(this.languageKnowledge).filter(item => item).length;
    }

    getHourlyRateCount() {
        return Object.values(this.hourlyRates).filter(item => item).length;
    }

    deepCopy() {
        return Object.assign(new SearchParams(), JSON.parse(JSON.stringify(this))) as SearchParams;
    }

    // ---- Internal ---- //
    private refreshSort() {
        this.sortOptions = [{ value: SortType.relevance, label: 'search.most-relevant' }];
        if (this.searchType !== SearchType.photoAndMap) {
            this.sortOptions.push({ value: SortType.distance, label: 'search.distance' });
        }
        this.sortOptions.push(
            ...[
                { value: SortType.recentActivity, label: 'search.loginDate' },
                { value: SortType.created, label: 'search.signupDate' },
            ],
        );

        const needsResetSort = this.sort === undefined || !this.sortOptions.some(item => item.value === this.sort);
        if (needsResetSort) {
            this.sort = this.role === UserRole.parent ? SortType.recentActivity : SortType.relevance;
        }
    }
}
