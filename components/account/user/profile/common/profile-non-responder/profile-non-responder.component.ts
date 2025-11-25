import { Component } from '@angular/core';
import { ProfileBlockComponent } from 'app/components/user/profile/common/profile-block/profile-block.component';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';

@Component({
    selector: 'profile-non-responder',
    templateUrl: './profile-non-responder.component.html',
    styleUrls: ['./profile-non-responder.component.less'],
    standalone: true,
    imports: [SharedModule, TranslateModule],
})
export class ProfileNonResponderComponent extends ProfileBlockComponent {}
