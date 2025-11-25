import { EventEmitter } from '@angular/core';
import { User } from 'app/models/api/user';
import { EnvironmentUtils } from 'app/utils/device-utils';
import { UserGroup } from 'app/models/api/user-group';
import { ImgSizeUtil } from 'app/utils/img-size-utils';
import { MapBounds, MapCoordinates } from 'app/models/generic-types';
import mapboxgl, { Map as MapboxMap, LngLatBoundsLike, MapboxOptions, Popup, Marker, LngLat } from 'mapbox-gl';
import { RouteType } from 'routing/route-type';
import { RouteService } from 'app/services/route.service';

export interface MapCameraPosition {
    zoom: number;
    center: MapCoordinates;
    totalArea: number;
}

export interface MapOptions {
    zoom: number;
    maxZoom: number;
    center: MapCoordinates;
    bounds: LngLatBoundsLike;
    interactive: boolean;
    navigationControls: boolean;
    clickableMarkers: boolean;
}

interface MapboxMapOptions {
    mapElement: HTMLElement;
    options: Partial<MapOptions>;
    routeService: RouteService;
}
export class MapboxMaps {
    static readonly mapsContainer = document.getElementById('maps-container') as HTMLElement;
    mapboxgl: typeof mapboxgl;
    map: MapboxMap;
    highlightedUserId?: string;
    boundsChanged = new EventEmitter<MapBounds>();
    cameraPositionChanged = new EventEmitter<MapCameraPosition>();
    activeUserChanged = new EventEmitter<User>();
    clicked = new EventEmitter<LngLat>();

    private static instance: MapboxMaps;
    private static mapInstance: MapboxMap;
    private userMarkers = new Map<string, Marker>();
    private userGroupMarkers: Record<string, Marker> = {};
    private clickableMarkers: boolean;
    private currentBounds: string;
    private infoWindow: Popup;
    private clickMarker?: Marker;
    private userLocationMarker: Marker;

    private constructor(
        private mapElement: HTMLElement,
        private routeService: RouteService,
    ) {}

    static async getInstance({ mapElement, options, routeService }: MapboxMapOptions) {
        const outerMapsContainer = this.mapsContainer;

        mapElement?.appendChild(outerMapsContainer);
        this.instance = this.instance ?? new MapboxMaps(outerMapsContainer, routeService);
        await this.instance.initMap(options);
        this.instance.clickableMarkers = options.clickableMarkers ?? false;
        return this.instance;
    }

    private async initMap(options: Partial<MapOptions>) {
        this.mapboxgl = (await import('mapbox-gl')).default;
        this.mapboxgl.accessToken = 'pk.eyJ1Ijoic2l0bHkxIiwiYSI6ImNqaWQ5ZzNpMzA1c2UzcWxpazBuMHI4eTAifQ.PGCZgChFlCIaMURlXTTugA';

        const mapOptions: MapboxOptions = {
            container: this.mapElement,
            style: 'mapbox://styles/sitly1/cjiu9egyt7j3q2sq83e8su46v', // style URL
            zoom: options.zoom ?? 13,
            maxZoom: options.maxZoom ?? 16,
        };
        if (typeof options.center !== 'undefined') {
            mapOptions.center = [options.center.lng, options.center.lat];
        }
        if (typeof options.interactive !== 'undefined') {
            mapOptions.interactive = options.interactive;
        }
        if (typeof options.bounds !== 'undefined') {
            mapOptions.bounds = options.bounds;
        }

        if (MapboxMaps.mapInstance) {
            this.map = MapboxMaps.mapInstance;

            if (typeof options.center !== 'undefined') {
                this.map.setCenter(options.center);
            }

            if (typeof options.zoom !== 'undefined') {
                this.map.setZoom(options.zoom);
            }

            if (typeof options.bounds !== 'undefined') {
                this.map.fitBounds(options.bounds);
            }

            setTimeout(() => {
                this.map.resize();
            }, 500);
        } else {
            this.map = MapboxMaps.mapInstance = new this.mapboxgl.Map(mapOptions);

            if (options.navigationControls) {
                this.map.addControl(new this.mapboxgl.NavigationControl(), 'top-left');
            }

            if (typeof options.bounds !== 'undefined') {
                this.map.fitBounds(options.bounds, { duration: 0 });
            }

            const boundsChanged = () => {
                if (this.routeService.routeType() !== RouteType.search) {
                    return;
                }

                const mapBounds = this.map.getBounds();
                if (mapBounds) {
                    if (mapBounds.toString() !== this.currentBounds) {
                        this.currentBounds = mapBounds.toString();
                        this.boundsChanged.emit({
                            north: mapBounds.getNorth(),
                            east: mapBounds.getEast(),
                            south: mapBounds.getSouth(),
                            west: mapBounds.getWest(),
                        });
                    }
                }

                const zoom = this.map.getZoom();
                const center = this.map.getCenter();
                if (zoom && center) {
                    const northWest = mapBounds.getNorthWest();
                    const northEast = mapBounds.getNorthEast();
                    const southWest = mapBounds.getSouthWest();
                    const totalAreaSqKmRounded = Math.round((northWest.distanceTo(southWest) * northWest.distanceTo(northEast)) / 1000);
                    this.cameraPositionChanged.emit({ zoom, center, totalArea: totalAreaSqKmRounded });
                }
            };

            let boundsTimeout: NodeJS.Timeout;
            const boundsEvent = (_e: unknown) => {
                clearTimeout(boundsTimeout);
                boundsTimeout = setTimeout(boundsChanged, 20);
            };

            const onLoad = (e: unknown) => {
                this.map.getStyle().layers?.forEach(element => {
                    if (element.type === 'symbol') {
                        this.map.setLayoutProperty(element.id, 'text-field', ['get', 'name']);
                    }
                });

                this.map.resize();

                boundsEvent(e);
            };
            this.map
                .on('load', onLoad)
                .on('zoomend', boundsEvent)
                .on('boxzoomend', boundsEvent)
                .on('moveend', boundsEvent)
                .on('click', e => {
                    if (![RouteType.search, RouteType.complete, RouteType.addressChange].includes(this.routeService.routeType())) {
                        return;
                    }

                    this.clicked.emit(e.lngLat);
                });
        }
    }

    private markerInnerHTML(user: User, showUserAvatar: boolean) {
        if (showUserAvatar) {
            const defaultImgSrc = 'https://cdn.sitly.com/nl/images/default-avatar-small.png';
            const imgSrc = user.links.avatar ? ImgSizeUtil.transform(`${user.links.avatar}`, 'small') : defaultImgSrc;

            return `<div class="selected-icon"><img src="${imgSrc}" onerror="this.src='${defaultImgSrc}'"></div>`;
        } else {
            let markerName;
            if (user.id === this.highlightedUserId) {
                markerName = user.isFavorite ? 'marker-favorite-highlighted' : 'marker-highlighted';
            } else if (user.isVisited) {
                markerName = user.isFavorite ? 'marker-favorite-visited' : 'marker-visited';
            } else {
                markerName = user.isFavorite ? 'marker-favorite' : 'marker';
            }

            return `<img src="/assets/images/map/${markerName}.svg">`;
        }
    }

    refreshUserMarker(user: User, showUserAvatar: boolean) {
        const marker = this.userMarkers.get(user.id);
        if (marker) {
            marker.getElement().innerHTML = this.markerInnerHTML(user, showUserAvatar);
            if (showUserAvatar) {
                marker.getElement().classList.add('avatar-marker');
            }
        } else {
            this.setUser(user, showUserAvatar);
        }
    }

    private setUser(user: User, showUserAvatar: boolean) {
        try {
            let marker = this.userMarkers.get(user.id);
            const markerContainer = marker ? marker.getElement() : document.createElement('div');
            markerContainer.innerHTML = this.markerInnerHTML(user, showUserAvatar);
            markerContainer.style.cursor = 'pointer';

            if (!marker) {
                marker = new this.mapboxgl.Marker(markerContainer)
                    .setLngLat([Number(user.longitude), Number(user.latitude)])
                    .addTo(this.map);
                if (this.clickableMarkers) {
                    markerContainer.addEventListener('click', () => {
                        if (this.routeService.routeType() !== RouteType.search) {
                            return;
                        }

                        this.activeUserChanged.emit(user);
                    });
                }
                this.userMarkers.set(user.id, marker);
            }
            if (showUserAvatar) {
                marker.getElement().classList.add('avatar-marker');
            }
        } catch (e) {
            console.log(e);
        }
    }

    setUserLocation(lat: number, lng: number) {
        if (!this.userLocationMarker) {
            const markerContainer = document.createElement('div');
            markerContainer.className = 'user-location-marker';
            this.userLocationMarker = new this.mapboxgl.Marker(markerContainer).setLngLat([Number(lng), Number(lat)]).addTo(this.map);
        }
        this.userLocationMarker.setLngLat([Number(lng), Number(lat)]);
    }

    clearAll() {
        this.clearUserMarkers();
        this.clearUserGroupMarkers();
        this.clearClickMarker();
    }

    setUserGroups(userGroups: UserGroup[]) {
        userGroups.forEach(userGroup => {
            this.addUserGroup(userGroup);
        });
    }

    placeClickMarker(location: LngLat, markerType: 'circle' | 'location' = 'circle') {
        if (this.clickMarker) {
            this.clickMarker.remove();
        }

        const markerContainer = document.createElement('div');
        markerContainer.innerHTML =
            markerType === 'location'
                ? '<img style="width:40px; height:40px; margin-top:-20px; object-fit:contain;" src="assets/images/location.svg">'
                : '<img style="width:32px; height:32px;" src="assets/images/marker-cluster.svg">';
        this.clickMarker = new this.mapboxgl.Marker(markerContainer)
            .setLngLat([Number(location.lng), Number(location.lat)])
            .addTo(this.map);
    }

    center(longitude: number, latitude: number, adjustForSearch = true) {
        const point = this.map.project([Number(longitude), Number(latitude)]);

        // make adjustment for small screens, otherwise active user popup will be partially hidden
        if (adjustForSearch && EnvironmentUtils.isDesktop()) {
            point.y -= 120;
        }
        this.map.panTo(this.map.unproject(point));
    }

    showUserPopup(user: User) {
        if (!this.infoWindow) {
            this.infoWindow = new this.mapboxgl.Popup({
                anchor: 'bottom',
                offset: {
                    bottom: [0, -16],
                },
                maxWidth: '350px',
                closeButton: false,
            });

            const userCardElement = document.getElementById('map-user-card');
            if (userCardElement) {
                this.infoWindow.setDOMContent(userCardElement);
            }
        }

        this.infoWindow.setLngLat([user.longitude, user.latitude]);
        setTimeout(() => {
            this.infoWindow.addTo(this.map);
        }, 0);
    }

    hideUserPopup() {
        if (this.infoWindow) {
            this.infoWindow.remove();
        }
    }

    contains(longitude: number, latitude: number) {
        const bounds = this.map.getBounds();
        return longitude > bounds.getWest() && longitude < bounds.getEast() && latitude > bounds.getSouth() && latitude < bounds.getNorth();
    }

    // ---- Internal ---- //
    private clearUserGroupMarkers() {
        Object.values(this.userGroupMarkers).forEach(marker => marker.remove());
        this.userGroupMarkers = {};
    }

    private addUserGroup(userGroup: UserGroup) {
        try {
            const markerContainer = document.createElement('div');
            markerContainer.className = 'user-group-marker';
            markerContainer.innerHTML = `${userGroup.count}`;
            const lngLat: [number, number] = [Number(+userGroup.longitude), Number(+userGroup.latitude)];
            const marker = new this.mapboxgl.Marker(markerContainer).setLngLat(lngLat).addTo(this.map);
            markerContainer.addEventListener('click', () => {
                this.map.setCenter(lngLat);
                this.map.setZoom(this.map.getZoom() + 1);
            });
            this.userGroupMarkers[userGroup.id] = marker;
        } catch (e) {
            console.log(e);
        }
    }

    private clearUserMarkers() {
        for (const userId of this.userMarkers.keys()) {
            try {
                this.userMarkers.get(userId)?.remove();
            } catch (error) {
                console.error(error);
            }
        }
        this.userMarkers.clear();
    }

    private clearClickMarker() {
        this.clickMarker?.remove();
        this.clickMarker = undefined;
    }
}
