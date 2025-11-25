import { Component, Output, EventEmitter, Input, inject } from '@angular/core';
import { BaseComponent } from 'app/components/base.component';
import { ProfileShareType } from 'app/components/user/profile/profile-share-type';
import { User } from 'app/models/api/user';
import { ShareProfileService } from 'app/services/share-profile.service';
import { EnvironmentUtils } from 'app/utils/device-utils';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';

@Component({
    selector: 'profile-share',
    templateUrl: './profile-share.component.html',
    styleUrls: ['./profile-share.component.less'],
    standalone: true,
    imports: [SharedModule, TranslateModule],
})
export class ProfileShareComponent extends BaseComponent {
    @Input({ required: true }) user: User;
    @Output() share = new EventEmitter<ProfileShareType>();
    @Output() cancel = new EventEmitter();

    shareOptions = this.isDesktop()
        ? [ProfileShareType.copy, ProfileShareType.facebook, ProfileShareType.email]
        : [ProfileShareType.whatsapp, ProfileShareType.messenger];

    ProfileShareType = ProfileShareType;

    get showCopyBtn() {
        return this.isDesktop() || EnvironmentUtils.isAndroid;
    }

    private shareService = inject(ShareProfileService);

    onShareClick(option: ProfileShareType) {
        this.shareService.share(option, this.user, () => this.share.emit(option));
    }
}
