import { Component, OnDestroy } from '@angular/core';
import { BaseComponent } from 'app/components/base.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    standalone: true,
    selector: 'premium-text',
    templateUrl: './premium-text.component.html',
    styleUrls: ['./premium-text.component.less'],
    imports: [TranslateModule],
})
export class PremiumTextComponent extends BaseComponent implements OnDestroy {
    logoSrc = `assets/images/premium/premium-overlay-logo-${this.authUser.isParent ? 'parent' : 'babysitter'}.svg`;
}
