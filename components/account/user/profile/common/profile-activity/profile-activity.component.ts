import { Component } from '@angular/core';
import { ProfileBlockComponent } from 'app/components/user/profile/common/profile-block/profile-block.component';
import { TranslateModule } from '@ngx-translate/core';
import { FormatPipeModule, FormatDistanceToNowPipeModule } from 'ngx-date-fns';
import { SharedModule } from 'modules/shared/shared.module';

@Component({
    selector: 'profile-activity',
    templateUrl: './profile-activity.component.html',
    styleUrls: ['./profile-activity.component.less'],
    standalone: true,
    imports: [SharedModule, FormatPipeModule, FormatDistanceToNowPipeModule, TranslateModule],
})
export class ProfileActivityComponent extends ProfileBlockComponent {}
