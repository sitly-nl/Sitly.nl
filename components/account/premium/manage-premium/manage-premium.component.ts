import { Component, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { takeUntil } from 'rxjs/operators';
import { BaseComponent } from 'app/components/base.component';
import { TranslateModule } from '@ngx-translate/core';
import { FormatPipeModule } from 'ngx-date-fns';
import { SharedModule } from 'modules/shared/shared.module';
import { VoucherComponent } from 'app/components/premium/voucher/voucher.component';

@Component({
    selector: 'manage-premium',
    templateUrl: './manage-premium.component.html',
    styleUrls: ['./manage-premium.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [SharedModule, VoucherComponent, FormatPipeModule, TranslateModule],
})
export class ManagePremiumComponent extends BaseComponent {
    @Output() showPremium = new EventEmitter();
    @Output() resumePremium = new EventEmitter();
    @Output() reactivatePremium = new EventEmitter();

    showVoucherOverlay = false;

    ngOnInit() {
        this.userService.changed.pipe(takeUntil(this.destroyed$)).subscribe(() => {
            this.cd.markForCheck();
        });
    }
}
