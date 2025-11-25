import { Component, HostListener } from '@angular/core';
import { EventAction } from 'app/services/tracking/types';
import { RouteType } from 'routing/route-type';
import { User } from 'app/models/api/user';
import { NoAuthBaseComponent } from 'app/components/no-auth-base.component';

@Component({
    template: '',
})
export abstract class BaseComponent<U = User> extends NoAuthBaseComponent {
    math = Math;
    RouteType = RouteType;

    get isDesktopWideScreen() {
        return window.innerWidth > 1100;
    }
    get countrySettings() {
        // TODO: build better system for countrySettings optionality management
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this.countrySettingsService.countrySettings!;
    }
    get authUser(): U {
        // TODO: build better system for user optionality management
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this.userService.authUser! as U;
    }

    @HostListener('window:resize')
    onResize() {
        /* dynamically switch from desktop to mobile view and back */
    }

    back(skipSimilarUrls = false) {
        this.navigationService.back(skipSimilarUrls);
    }

    trackCtaEvent(event: string, action: EventAction, platformAware = true, trackDesktop = true) {
        if (!this.isDesktop() || trackDesktop) {
            let message = event;
            let eventAction: string = action;
            if (platformAware) {
                const platform = this.isDesktop() ? 'desktop' : 'mobile';
                message = `${platform}-${event}`;
                eventAction = `${platform}-${eventAction}`;
            }
            this.trackingService.trackCtaEvent(`${message}`, eventAction);
        }
    }
}
