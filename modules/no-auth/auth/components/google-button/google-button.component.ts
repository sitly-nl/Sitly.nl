import { Component, ElementRef, EventEmitter, NgZone, Output, ViewChild, inject } from '@angular/core';
import { Constants } from 'app/utils/constants';
import { SocialUserToken } from 'app/models/generic-types';
import { LocaleService } from 'app/services/locale.service';

@Component({
    selector: 'google-button',
    templateUrl: './google-button.component.html',
    styleUrls: ['./google-button.component.less'],
    standalone: true,
})
export class GoogleButtonComponent {
    @ViewChild('btnDiv') btnDivRef: ElementRef<HTMLDivElement>;
    @Output() token = new EventEmitter<SocialUserToken>();

    private readonly buttonMinSize = 200;
    private readonly buttonMaxSize = 400;
    private readonly localeService = inject(LocaleService);
    private readonly zone = inject(NgZone);

    private initialized = false;

    ngOnInit() {
        google.accounts.id.initialize({
            client_id: Constants.googleClientId,
            auto_select: false,
            callback: response => {
                if (response.credential) {
                    // Added this.zone.run(() => {}) because apparently this event happens outside of Angular zone.
                    // Then, when router.navigate() called in result, you can see warning in console about navigation called from wrong zone
                    this.zone.run(() => {
                        this.token.emit({
                            accessToken: response.credential,
                            provider: 'google',
                        });
                    });
                }
            },
        });
        google.accounts.id.disableAutoSelect();
    }

    ngAfterViewChecked() {
        const width = this.btnDivRef.nativeElement.clientWidth ?? 0;
        if (width > 0 && !this.initialized) {
            google.accounts.id.renderButton(this.btnDivRef.nativeElement, {
                theme: 'outline',
                size: 'medium',
                type: 'standard',
                width: Math.min(Math.max(width, this.buttonMinSize), this.buttonMaxSize),
                shape: 'pill',
                logo_alignment: 'center',
                text: 'continue_with',
                locale: this.localeService.getLocaleCode(),
            });
            this.initialized = true;
        }
    }
}
