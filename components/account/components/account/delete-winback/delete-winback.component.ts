import { Input, Component, EventEmitter, Output } from '@angular/core';
import { BaseOverlayComponent } from 'app/components/common/overlay-content/base-overlay.component';
import { BaseOverlayContentData } from 'app/components/common/overlay-content/types';
import { User } from 'app/models/api/user';
import { SharedModule } from 'modules/shared/shared.module';

export interface DeleteWinbackData {
    authUser: User;
    showDiscountOffer: boolean;
}

@Component({
    selector: 'delete-winback',
    templateUrl: './delete-winback.component.html',
    styleUrls: ['./delete-winback.component.less'],
    standalone: true,
    imports: [SharedModule],
})
export class DeleteWinbackComponent extends BaseOverlayComponent {
    @Output() hideAccount = new EventEmitter();
    @Output() deleteAccount = new EventEmitter();
    @Output() backClicked = new EventEmitter();
    @Output() useForFree = new EventEmitter();

    @Input() showDiscountOffer = false;

    ngOnInit() {
        const data: BaseOverlayContentData = {};
        if (this.authUser.isParent) {
            data.title = 'deleteWinback.title.parents';
            data.message = 'deleteWinback.description.parents';
        } else {
            data.title = 'deleteWinback.title.fosters';
            data.message = 'deleteWinback.description.fosters';
        }

        if (this.authUser.isParent) {
            if (this.authUser.isPremium && this.authUser.canCancelPremium) {
                data.primaryBtn = { title: 'deleteWinback.hideAccount.premium', action: () => this.hideAccount.emit() };
            } else {
                data.primaryBtn = { title: 'deleteWinback.hideAccount.nonPremium', action: () => this.hideAccount.emit() };
            }
        } else {
            data.primaryBtn = { title: 'deleteWinback.useForFree', action: () => this.useForFree.emit() };
        }

        data.secondaryBtn = {
            title: 'main.back',
            action: () => {
                if (this.showDiscountOffer) {
                    this.backClicked.emit();
                }
            },
        };
        data.linkBtn = { title: 'deleteWinback.deleteAnyway', action: () => this.deleteAccount.emit() };

        this.data.set(data);
    }
}
