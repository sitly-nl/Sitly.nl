import { SearchParamsUtils } from 'app/components/search/search-params-utils';
import { BaseComponent } from 'app/components/base.component';
import { SearchResults } from 'app/models/search';
import { ToolbarActionType } from 'modules/shared/components/toolbar-old/toolbar.component';
import { UserRole, User } from 'app/models/api/user';
import { inject, Component, ViewChild, ChangeDetectionStrategy, OnInit, HostListener } from '@angular/core';
import { SearchParams, SearchType } from 'app/components/search/search-params';
import { ActivatedRoute } from '@angular/router';
import { MapSearchComponent } from 'app/components/search/map/map-search.component';
import { ApiService, Error } from 'app/services/api/api.service';
import { UserUpdatesService } from 'app/services/user-updates.service';
import { FavoriteService } from 'app/services/api/favorite.service';
import { RouteType } from 'routing/route-type';
import { NgForm } from '@angular/forms';
import { takeUntil } from 'rxjs/operators';
import { EventAction } from 'app/services/tracking/types';
import { FilterType } from 'app/components/search/filters/search-filters-types';
import { AvailabilityUtils } from 'app/utils/availability-utils';
import { MapBounds } from 'app/models/generic-types';
import { SessionService } from 'app/services/session.service';
import { UserGroup } from 'app/models/api/user-group';
import { AppEventService } from 'app/services/event.service';
import { CommonOverlayService } from 'app/services/overlay/common-overlay.service';
import { environment } from 'environments/environment';
import { TranslateModule } from '@ngx-translate/core';
import { SearchFiltersComponent, SearchFiltersComponentDesktop } from 'app/components/search/filters/search-filters.component';
import { SharedModule } from 'modules/shared/shared.module';
import { PhotoSearchComponent } from 'app/components/search/photo/photo-search.component';
import { DeveloperMenuService } from 'app/services/developer-menu.service';

@Component({
    selector: 'search-results',
    templateUrl: './search.component.html',
    styleUrls: ['./search.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        SharedModule,
        PhotoSearchComponent,
        MapSearchComponent,
        SearchFiltersComponent,
        SearchFiltersComponentDesktop,
        TranslateModule,
    ],
})
export class SearchComponent extends BaseComponent implements OnInit {
    readonly userUpdatesService = inject(UserUpdatesService);
    readonly sessionService = inject(SessionService);
    readonly route = inject(ActivatedRoute);
    readonly apiService = inject(ApiService);
    readonly favoriteService = inject(FavoriteService);
    readonly eventService = inject(AppEventService);
    readonly commonOverlayService = inject(CommonOverlayService);
    private readonly developerMenuService = inject(DeveloperMenuService);

    @ViewChild('searchForm', { static: true }) form: NgForm;
    @ViewChild('mapSearch') mapSearch: MapSearchComponent;

    SearchType = SearchType;
    UserRole = UserRole;
    searchParams = SearchParams.restoredIfNeeds(this.authUser, this.countrySettings, this.storageService);
    previousSearchParams = this.searchParams.deepCopy();
    searchType?: SearchType;
    searchResult?: SearchResults;
    filtersVisible = false;
    selectedFilter?: FilterType;
    showMap = false;
    needsUpdateAddress = false;
    isLive = true;
    automaticallySwitchedToPhoto = false;
    initialSearchPerformed = false;
    filtersChanged = false;

    get showLoader() {
        switch (this.searchType) {
            case SearchType.photo:
                return !this.endOfList;
            case SearchType.photoAndMap:
                return !this.canRequest && !this.endOfList;
            default:
                return false;
        }
    }
    get leftActions() {
        if (this.searchType === SearchType.map) {
            return [ToolbarActionType.photos];
        } else {
            return this.showMap ? [ToolbarActionType.map] : [];
        }
    }
    get rightActions() {
        return [ToolbarActionType.filters];
    }
    get showPhotoSearch() {
        return this.searchType === SearchType.photo && !this.needsUpdateAddress;
    }
    get showFiltersToolbar() {
        return !this.authUser?.isParent || this.authUser?.links.avatar || !this.sessionService.firstSession;
    }
    get hasDistanceFilter() {
        return this.searchParams.maxDistance;
    }
    get hasExperienceGroupsFilter() {
        return this.searchParams.ageGroupExperienceOptions.filter(item => item.value).length > 0;
    }
    get hasCareTypeFilter() {
        return this.searchParams.hasRegularCare || this.searchParams.hasOccasionalCare || this.searchParams.hasAfterSchool;
    }
    get hasAgeRangeFilter() {
        return this.searchParams?.childrenMinAge !== 0 || this.searchParams?.childrenMaxAge !== 15;
    }
    get hasAvailabilityFilter() {
        return !AvailabilityUtils.isEmpty(this.searchParams.availabilityObject);
    }

    private canRequest = true;
    private newChanges = false;
    private endOfList = false;
    private get isLastPage() {
        return this.searchParams.page === this.searchResult?.totalPages || this.searchResult?.totalPages === 0;
    }

    ngOnInit() {
        this.showMap = this.countrySettings.showMapBackend;
        this.isLive = environment.name === 'production';

        this.userService.changedWithPreviousUser.pipe(takeUntil(this.destroyed$)).subscribe(previousUser => {
            this.needsUpdateAddress =
                this.needsUpdateAddress ||
                previousUser?.placeName !== this.authUser.placeName ||
                previousUser?.streetName !== this.authUser.streetName ||
                previousUser?.houseNumber !== this.authUser.houseNumber;
            if (this.needsUpdateAddress) {
                this.needsUpdateAddress = false;

                this.clearFilters();
                this.apiService.clearCache();

                this.restartSearch();
            } else {
                this.searchParams.populate(this.authUser, this.countrySettings);
            }
        });

        this.countrySettingsService.changed.pipe(takeUntil(this.destroyed$)).subscribe(_ => {
            this.searchParams.populate(this.authUser, this.countrySettings);
        });

        this.favoriteService.changed.pipe(takeUntil(this.destroyed$)).subscribe(favorites => {
            if (this.searchResult?.users) {
                const favoriteIds = favorites.map(user => user.id);

                const users = this.searchResult.users;
                users.forEach(user => (user.isFavorite = favoriteIds.includes(user.id)));
                this.searchResult = this.searchResult.byUpdatingUsers(users);

                this.cd.detectChanges();
            }
        });
        this.route.paramMap.pipe(takeUntil(this.destroyed$)).subscribe(params => {
            const searchType = params.get('searchType') as SearchType;

            if (this.automaticallySwitchedToPhoto && searchType !== SearchType.photo) {
                this.automaticallySwitchedToPhoto = false;
            }

            const smallForCombined = searchType === SearchType.photoAndMap && !this.isDesktopWideScreen;
            const mapNotAvailable = (searchType === SearchType.map || searchType === SearchType.photoAndMap) && !this.showMap;
            if (smallForCombined || mapNotAvailable) {
                this.navigationService.navigate(RouteType.search, SearchType.photo, {
                    preserveFragment: true,
                    queryParamsHandling: 'merge',
                });
                return;
            }

            this.searchType = searchType;
            this.searchParams.searchType = this.searchType;
            if (this.searchType === SearchType.photo) {
                this.searchParams.bounds = undefined;
            }

            this.cd.markForCheck();

            this.restartSearch();
        });

        if (this.form) {
            this.form.control.valueChanges.pipe(takeUntil(this.destroyed$)).subscribe(_ => {
                if (this.form.control.dirty) {
                    setTimeout(() => {
                        // needs to wait till searchParams actually changed
                        this.restartSearch();
                    }, 0);
                }
            });
        }

        this.eventService.sendPromptCheckEvent();
    }

    @HostListener('window:resize')
    onResize() {
        if (this.isDesktop() && this.routeService.routeType() === RouteType.search) {
            if (this.searchType === SearchType.photoAndMap && !this.isDesktopWideScreen) {
                this.navigationService.navigate(RouteType.search, 'photo');
                this.automaticallySwitchedToPhoto = true;
            } else if (
                this.automaticallySwitchedToPhoto &&
                this.showMap &&
                this.searchType === SearchType.photo &&
                this.isDesktopWideScreen
            ) {
                this.navigationService.navigate(RouteType.search, 'photo-and-map', { preserveFragment: true });
            }
        }
    }

    showPremium() {
        this.navigationService.showPremium();
    }

    showDevMenu() {
        this.developerMenuService.openMenu();
    }

    // --------- Filters and search --------- //
    restoreFilters() {
        this.searchParams = SearchParams.restoredIfNeeds(this.authUser, this.countrySettings, this.storageService, true);
        this.populate();
    }

    restartSearch() {
        this.searchParams.page = 1;
        this.populate();
    }

    onFiltered(searchParams: SearchParams) {
        this.filtersChanged = true;
        this.searchParams = searchParams;
        this.restartSearch();

        // track this event only once per day
        if (this.storageService.lastSearchTrackingTime?.getDate() !== new Date().getDate()) {
            this.storageService.lastSearchTrackingTime = new Date();
            this.trackingService.trackCtaEvent('select_any-filter', 'filter-selection');
        }
    }

    boundsChanged(bounds: MapBounds) {
        this.searchParams.bounds = bounds;
        this.restartSearch();
    }

    onScroll() {
        if (!this.isLastPage) {
            this.searchParams.page++;
        }
        this.populate();
    }

    onPageChanged(page: number) {
        if (page === this.searchParams.page) {
            return;
        }

        this.searchResult = this.searchResult?.byUpdatingUsers([]);

        setTimeout(() => {
            // to let page redraw with no results - scroll to top
            this.searchParams.page = page;
            this.populate();
        }, 0);
    }

    clearFilters() {
        this.searchParams = this.searchParams.cleaned(this.authUser, this.countrySettings);
        this.restartSearch();
    }

    onFilterClick(event: Event) {
        const id = (event?.target as HTMLElement)?.id;
        this.filtersVisible = true;
        if (id === 'distance') {
            this.selectedFilter = FilterType.maxDistance;
        } else if (id === 'ageGroups') {
            this.selectedFilter = FilterType.ageGroups;
        } else if (id === 'careType') {
            this.selectedFilter = FilterType.careType;
        } else if (id === 'availability') {
            this.selectedFilter = FilterType.availability;
        } else if (id === 'age-range') {
            this.selectedFilter = FilterType.childrenMaxAge;
        } else {
            this.selectedFilter = undefined;
        }
    }

    // ------- Other -------- //
    toolbarActionSelected(action: ToolbarActionType) {
        switch (action) {
            case ToolbarActionType.map:
                this.onMapClick();
                break;
            case ToolbarActionType.photos:
                this.trackCtaEvent('mapview-select-select_photoview', EventAction.mapView);
                this.navigationService.navigate(RouteType.search, 'photo');
                break;
            case ToolbarActionType.filters:
                this.trackCtaEvent('searchlist-select_filter', EventAction.filterSelection);
                this.filtersVisible = true;
                break;
        }
    }

    onMapClick() {
        this.trackCtaEvent('searchlist-select_mapview', EventAction.searchListView);
        this.navigationService.navigate(RouteType.search, 'map');
    }

    // ---- INTERNAL ---- //
    private populate() {
        if (!this.canRequest) {
            this.newChanges = true;
            return;
        }

        this.previousSearchParams.lastUpdated = this.searchParams.lastUpdated;
        const filtersUpdated = JSON.stringify(this.searchParams) !== JSON.stringify(this.previousSearchParams);
        if (filtersUpdated) {
            this.searchParams.lastUpdated = new Date().getTime();
            this.previousSearchParams = this.searchParams.deepCopy();
            this.storageService.filters = this.searchParams;
        }
        if (!filtersUpdated && this.searchResult) {
            return;
        }

        if (!SearchParamsUtils.isReady(this.searchParams)) {
            return;
        }

        this.canRequest = false;
        this.endOfList = false;
        this.cd.detectChanges();

        this.userService.search(this.searchParams).subscribe(
            response => {
                if (response?.data instanceof Array) {
                    if (response.data.length === 0) {
                        this.searchResult = new SearchResults([], undefined, response.meta?.totalCount, response.meta?.totalPages);
                    } else if (response.data[0] instanceof User) {
                        if (this.searchResult && this.searchParams.page > 1) {
                            if (this.searchType === SearchType.photoAndMap) {
                                this.searchResult = this.searchResult.byUpdatingUsers(response.data as User[]);
                            } else {
                                this.searchResult = this.searchResult.byUpdatingUsers(
                                    this.searchResult.users.concat(response.data as User[]),
                                );
                            }
                        } else {
                            this.searchResult = new SearchResults(
                                response.data as User[],
                                undefined,
                                response.meta?.totalCount,
                                response.meta?.totalPages,
                            );
                        }
                        this.storageService.cachedUsers = this.searchResult.users;
                    } else {
                        this.searchResult = new SearchResults(undefined, response.data as UserGroup[], response.meta?.totalCount);
                    }
                }

                this.endOfList = !response.data || this.isLastPage;
                this.canRequest = true;

                this.cd.detectChanges();
                if (!this.initialSearchPerformed) {
                    this.initialSearchPerformed = true;
                    this.trackingService.trackSearchResults(this.searchResult?.totalCount ?? 0);
                }

                if (this.newChanges) {
                    this.newChanges = false;
                    this.populate();
                }
            },
            (error: Error<{ source: { parameter: string }; code: string }>) => {
                const coordinatesError = error.error?.errors?.find(
                    errorItem => errorItem.source?.parameter === 'coordinates' && errorItem.code === 'REQUIRED',
                );
                if (coordinatesError) {
                    this.needsUpdateAddress = true;
                    this.navigationService.navigate(RouteType.addressChange);
                }
                this.canRequest = true;
                this.endOfList = true;
            },
        );
    }
}
