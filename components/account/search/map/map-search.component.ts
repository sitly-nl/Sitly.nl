import { MapOptions, MapboxMaps } from 'app/components/search/map/mapbox-maps';
import { User } from 'app/models/api/user';
import { inject, Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { BaseComponent } from 'app/components/base.component';
import { FavoriteService, UserFavoritesChangedInterface } from 'app/services/api/favorite.service';
import { SearchResults } from 'app/models/search';
import { HiddenUserService } from 'app/services/hidden-user.service';
import { takeUntil } from 'rxjs/operators';
import { EventAction } from 'app/services/tracking/types';
import { MapBounds } from 'app/models/generic-types';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { UserCardComponent } from 'app/components/user/user-card/user-card.component';

@Component({
    selector: 'map-search',
    templateUrl: 'map-search.component.html',
    styleUrls: ['map-search.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [RouterLink, UserCardComponent, TranslateModule],
})
export class MapSearchComponent extends BaseComponent implements OnInit, OnChanges {
    readonly favoriteService = inject(FavoriteService);
    readonly hiddenUserService = inject(HiddenUserService);
    readonly router = inject(Router);

    @Input() searchResult?: SearchResults;
    @Input() isCombinedView = false;

    @Output() boundsChanged = new EventEmitter<MapBounds>();

    activeUser?: User;
    users: User[] = [];
    visitedUsersIds = new Set();
    EventAction = EventAction;

    private map?: MapboxMaps;

    ngOnInit() {
        this.initMap();

        this.router.events.pipe(takeUntil(this.destroyed$)).subscribe(event => {
            if (event instanceof NavigationEnd) {
                const mapElement = document.getElementById('mapsContainerSearch');
                if (mapElement && !mapElement?.innerHTML.trim()) {
                    mapElement?.appendChild(MapboxMaps.mapsContainer);
                    MapboxMaps.getInstance({
                        mapElement,
                        options: this.getMapOptions(),
                        routeService: this.routeService,
                    }).then(instance => {
                        this.map = instance;
                    });
                }
            }
        });

        if (!this.isCombinedView && !this.storageService.mapSearchTracked) {
            this.trackCtaEvent('mapview-loads', EventAction.mapView);
            this.storageService.mapSearchTracked = true;
        }
        if (this.isCombinedView && !this.storageService.combinedSearchTracked) {
            this.trackCtaEvent('search-map-list-loads', EventAction.searchMapListView);
            this.storageService.combinedSearchTracked = true;
        }
    }

    getMapOptions() {
        const mapOptions: Partial<MapOptions> = {
            clickableMarkers: true,
            navigationControls: this.isDesktop(),
        };
        if (this.storageService.lastMapCameraPosition) {
            mapOptions.center = this.storageService.lastMapCameraPosition.center;
            mapOptions.zoom = this.storageService.lastMapCameraPosition.zoom;
        } else {
            mapOptions.center = {
                lat: Number(this.authUser.latitude),
                lng: Number(this.authUser.longitude),
            };
            const zoomAdjustment = this.isDesktop() ? 0 : -1;
            mapOptions.zoom = this.authUser.mapInitialZoomLevel + zoomAdjustment;
        }

        return mapOptions;
    }

    initMap() {
        const mapElement = document.getElementById('mapsContainerSearch');
        if (!mapElement) {
            return;
        }
        MapboxMaps.getInstance({
            mapElement,
            options: this.getMapOptions(),
            routeService: this.routeService,
        }).then(instance => {
            instance.activeUserChanged.pipe(takeUntil(this.destroyed$)).subscribe((user: User) => {
                this.visitedUsersIds.add(user.id);

                this.activeUser = user;
                this.activeUser.isVisited = true;

                if (this.isDesktop()) {
                    // user card added to the layout only when active user is set
                    // we have to wait until document will be updated and then card can be attached to popup window
                    setTimeout(() => instance.showUserPopup(user), 0);
                }
                instance.refreshUserMarker(this.activeUser, this.showAvatar(this.activeUser));
                instance.center(this.activeUser.longitude, this.activeUser.latitude);
                this.cd.markForCheck();
                this.trackingService.trackMapMarkerClicked(this.activeUser.distance);
            });

            instance.boundsChanged.pipe(takeUntil(this.destroyed$)).subscribe(bounds => {
                this.boundsChanged.emit(bounds);
                this.cd.markForCheck();
            });
            instance.cameraPositionChanged.pipe(takeUntil(this.destroyed$)).subscribe(position => {
                this.trackingService.trackMapZoomChanged(position.zoom, position.totalArea);
                this.storageService.lastMapCameraPosition = position;
            });

            this.favoriteService.changedUser.pipe(takeUntil(this.destroyed$)).subscribe((change: UserFavoritesChangedInterface) => {
                if (this.activeUser && this.activeUser.id === change.userId) {
                    this.activeUser.isFavorite = change.favorite;
                    instance.showUserPopup(this.activeUser);
                    this.cd.markForCheck();
                }

                const user = this.users.find(item => item.id === change.userId);
                if (user) {
                    user.isFavorite = change.favorite;
                    instance.refreshUserMarker(user, this.showAvatar(user));
                }
            });

            this.hiddenUserService.hiddenUsers.pipe(takeUntil(this.destroyed$)).subscribe(_ => {
                this.users = this.searchResult?.users.filter(user => !this.hiddenUserService.isHidden(user)) ?? [];
                instance.clearAll();
                this.users.forEach(user => {
                    instance.refreshUserMarker(user, this.showAvatar(user));
                });
                this.syncActiveUser();
            });

            this.map = instance;
        });

        setTimeout(() => {
            const initBounds = this.map?.map.getBounds();
            if (initBounds) {
                this.boundsChanged.emit({
                    east: initBounds.getEast(),
                    west: initBounds.getWest(),
                    north: initBounds.getNorth(),
                    south: initBounds.getSouth(),
                });
            }
        }, 0);
    }

    ngOnChanges(changes: SimpleChanges) {
        if (!this.map) {
            return;
        }

        const searchResult = changes.searchResult?.currentValue as SearchResults;
        if (searchResult) {
            this.map.clearAll();

            if (searchResult.users.length > 0) {
                const users = searchResult.users.filter(user => !this.hiddenUserService.isHidden(user));
                this.users = users;
                this.users.forEach(user => {
                    user.isVisited = this.visitedUsersIds.has(user.id);
                    this.map?.refreshUserMarker(user, false);
                });
                this.syncActiveUser();
            } else if (searchResult.userGroups.length > 0) {
                this.map.setUserGroups(searchResult.userGroups);
            }

            if (this.authUser.latitude && this.authUser.longitude) {
                this.map.setUserLocation(this.authUser.latitude, this.authUser.longitude);
            }

            this.cd.markForCheck();
        }
    }

    favoriteChanged(user: User) {
        const cachedUser = this.users.find(item => item.id === user.id);
        if (cachedUser) {
            cachedUser.isFavorite = user.isFavorite;
            this.map?.refreshUserMarker(cachedUser, this.showAvatar(cachedUser));
            if (user.isFavorite) {
                this.trackCtaEvent('map-view-add_favorite', EventAction.addToFavorite);
            } else {
                this.trackCtaEvent('map-view-remove_favorite', EventAction.addToFavorite);
            }
        }
    }

    centerMap() {
        if (this.authUser.latitude && this.authUser.longitude) {
            this.map?.center(this.authUser.longitude, this.authUser.latitude);
        }
    }

    updateHighlightedUser(id: string | null) {
        const map = this.map;
        if (!map) {
            return;
        }

        const userIdsToUpdate: string[] = [];
        if (map.highlightedUserId) {
            userIdsToUpdate.push(map.highlightedUserId);
        }
        if (id) {
            userIdsToUpdate.push(id);
        }
        map.highlightedUserId = id ?? undefined;

        userIdsToUpdate
            .map(item => this.users.find(user => user.id === item))
            .filter(item => item !== undefined)
            .forEach(item => map.refreshUserMarker(item, this.showAvatar(item)));
    }

    onUserClick(user: User) {
        this.trackingService.trackUserProfileClicked(user, 'map-user');
    }

    private showAvatar(user: User) {
        return !this.isDesktop() && this.activeUser?.id === user.id;
    }

    private syncActiveUser() {
        if (this.activeUser) {
            const activeUserFound = this.users.some(item => item.id === this.activeUser?.id);
            if (activeUserFound) {
                this.map?.refreshUserMarker(this.activeUser, this.showAvatar(this.activeUser));
            } else {
                this.map?.hideUserPopup();
                this.activeUser = undefined;
            }
        }
    }
}
