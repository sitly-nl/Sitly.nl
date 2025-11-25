import { Directive, EventEmitter, HostListener, NgZone, Output, inject } from '@angular/core';
import { SocialUserToken } from 'app/models/generic-types';
import { FacebookTokenService } from 'app/services/facebook/facebook-token.service';

@Directive({
    selector: 'button[facebook-btn],system-button[facebook-btn]',
})
export class FacebookButtonDirective {
    @Output() token = new EventEmitter<SocialUserToken>();

    private facebookTokenService = inject(FacebookTokenService);
    private zone = inject(NgZone);

    @HostListener('click', ['$event.target'])
    onClick() {
        this.loginWithFacebook();
    }

    private loginWithFacebook() {
        this.facebookTokenService.requestToken().subscribe(token => {
            // Added this.zone.run(() => {}) because apparently this event happens outside of Angular zone.
            // Then, when router.navigate() called in result, you can see warning in console about navigation called from wrong zone
            this.zone.run(() => {
                this.token.emit({
                    accessToken: token,
                    provider: 'facebook',
                });
            });
        });
    }
}
