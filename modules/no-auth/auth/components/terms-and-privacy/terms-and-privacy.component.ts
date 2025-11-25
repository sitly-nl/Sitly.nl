import { Component, ViewEncapsulation, inject } from '@angular/core';
import { NoAuthBaseComponent } from 'app/components/no-auth-base.component';
import { CommonOverlayService } from 'app/services/overlay/common-overlay.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'terms-and-privacy',
    templateUrl: './terms-and-privacy.component.html',
    styleUrls: ['./terms-and-privacy.component.less'],
    encapsulation: ViewEncapsulation.ShadowDom,
    standalone: true,
    imports: [TranslateModule],
})
export class TermsAndPrivacyComponent extends NoAuthBaseComponent {
    private readonly commonOverlayService = inject(CommonOverlayService);

    onTermsClick(event: Event) {
        event.preventDefault();

        const target = event.target as HTMLAnchorElement;

        if (target?.href?.endsWith('privacy')) {
            this.commonOverlayService.showPrivacyOverlay();
        } else if (target?.href?.endsWith('terms')) {
            this.commonOverlayService.showTermsOverlay();
        }
    }
}
