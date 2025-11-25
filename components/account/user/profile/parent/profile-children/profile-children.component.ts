import { Component } from '@angular/core';
import { ProfileBlockComponent } from 'app/components/user/profile/common/profile-block/profile-block.component';
import { Gender } from 'app/models/api/user';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';
import { AsyncPipe } from '@angular/common';

@Component({
    selector: 'profile-children',
    templateUrl: './profile-children.component.html',
    styleUrls: ['./profile-children.component.less'],
    standalone: true,
    imports: [SharedModule, AsyncPipe, TranslateModule],
})
export class ProfileChildrenComponent extends ProfileBlockComponent {
    Gender = Gender;
}
