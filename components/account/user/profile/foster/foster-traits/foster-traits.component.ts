import { Component } from '@angular/core';
import { ProfileBlockComponent } from 'app/components/user/profile/common/profile-block/profile-block.component';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';

@Component({
    selector: 'foster-traits',
    templateUrl: './foster-traits.component.html',
    styleUrls: ['./foster-traits.component.less'],
    standalone: true,
    imports: [SharedModule, TranslateModule],
})
export class FosterTraitsComponent extends ProfileBlockComponent {}
