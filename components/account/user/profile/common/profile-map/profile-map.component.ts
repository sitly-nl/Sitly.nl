import { Component, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { MapboxMaps } from 'app/components/search/map/mapbox-maps';
import { ProfileBlockComponent } from 'app/components/user/profile/common/profile-block/profile-block.component';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';

@Component({
    selector: 'profile-map',
    templateUrl: './profile-map.component.html',
    styleUrls: ['./profile-map.component.less'],
    standalone: true,
    imports: [SharedModule, TranslateModule],
})
export class ProfileMapComponent extends ProfileBlockComponent implements OnInit, OnChanges {
    mapActivated = false;

    private map: MapboxMaps;

    ngOnInit() {
        this.reloadMap();
    }

    ngOnChanges(change: SimpleChanges) {
        if (change.user) {
            this.reloadMap();
        }
    }

    reloadMap() {
        if (this.user && this.mapActivated) {
            const userLocation = {
                lat: Number(this.user.latitude),
                lng: Number(this.user.longitude),
            };
            setTimeout(() => {
                const mapElement = document.getElementById('map');
                if (mapElement) {
                    MapboxMaps.getInstance({
                        mapElement,
                        options: {
                            zoom: 15,
                            clickableMarkers: false,
                            center: userLocation,
                            maxZoom: 15,
                            interactive: this.mapActivated,
                        },
                        routeService: this.routeService,
                    }).then(instance => {
                        this.map = instance;
                        this.map.clearAll();
                        this.map.refreshUserMarker(this.user, true);
                        this.cd.markForCheck();
                    });
                }
            }, 0);
        }
    }
}
