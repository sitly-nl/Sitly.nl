import { Injectable, inject } from '@angular/core';
import { StorageService } from 'app/services/storage.service';
import { environment } from 'environments/environment';

@Injectable({
    providedIn: 'root',
})
export class EnvironmentService {
    private readonly storageService = inject(StorageService);

    get isAndroidApp() {
        return (
            sessionStorage.getItem('android-app') === 'true' ||
            window.document.referrer.startsWith('android-app') ||
            (environment.name !== 'production' && this.storageService.platform === 'android-app')
        );
    }

    get trackingPlatform() {
        return this.isAndroidApp ? 'android-app' : this.isInstalledPWA ? 'installed-pwa' : 'web-app';
    }

    private get isInstalledPWA() {
        return window.matchMedia('(display-mode: standalone)').matches;
    }
}
