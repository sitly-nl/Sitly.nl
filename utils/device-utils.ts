import { signal } from '@angular/core';

export class EnvironmentUtils {
    static get isLocalhost() {
        return window.location.origin.includes('localhost');
    }
    static get isAndroid() {
        return navigator.userAgent?.includes('Android');
    }
    static get isIos() {
        return navigator.userAgent?.includes('Mac OS');
    }

    private static get isDesktopWindowWidth() {
        return window.innerWidth > 768;
    }

    static readonly isDesktop = signal(EnvironmentUtils.isDesktopWindowWidth);

    static onResize() {
        if (EnvironmentUtils.isDesktopWindowWidth !== EnvironmentUtils.isDesktop()) {
            EnvironmentUtils.isDesktop.set(EnvironmentUtils.isDesktopWindowWidth);
        }
    }
}
