import { AfterViewChecked, Component, ElementRef, ViewChild } from '@angular/core';
import { ProfileBlockComponent } from 'app/components/user/profile/common/profile-block/profile-block.component';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';

@Component({
    selector: 'profile-about',
    templateUrl: './profile-about.component.html',
    styleUrls: ['./profile-about.component.less'],
    standalone: true,
    imports: [SharedModule, TranslateModule],
})
export class ProfileAboutComponent extends ProfileBlockComponent implements AfterViewChecked {
    @ViewChild('aboutField') aboutField: ElementRef<HTMLDivElement>;

    extended = false;
    extendable = false;

    ngAfterViewChecked() {
        this.extendable = this.aboutField.nativeElement.scrollHeight > this.aboutField.nativeElement.clientHeight;
        this.cd.detectChanges();
    }

    extendText() {
        this.extended = true;
        this.cd.detectChanges();
    }
}
