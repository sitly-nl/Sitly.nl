import { Component } from '@angular/core';
import { Child } from 'app/models/api/child';
import { RegistrationBaseComponent } from 'registration/components/registration-base.component';
import { Gender } from 'app/models/api/user';
import { RegistrationEditChildComponent } from 'registration/components/steps/parent/children/edit/registration-edit-child.component';
import { TranslateModule } from '@ngx-translate/core';
import { FormatPipeModule } from 'ngx-date-fns';
import { SharedModule } from 'modules/shared/shared.module';
import { AsyncPipe } from '@angular/common';
import { RegistrationPageContainerComponent } from 'registration/components/page-container/registration-page-container.component';

@Component({
    selector: 'registration-children',
    templateUrl: './registration-children.component.html',
    styleUrls: ['./registration-children.component.less'],
    standalone: true,
    imports: [RegistrationPageContainerComponent, SharedModule, AsyncPipe, FormatPipeModule, TranslateModule],
})
export class RegistrationChildrenComponent extends RegistrationBaseComponent {
    Gender = Gender;

    get showAddExpectingChild() {
        return this.authUser.children.length < 4 && !this.authUser.children.some(child => child.gender === Gender.unknown);
    }

    addChild() {
        this.showEditChild('born');
    }

    addExpectingChild() {
        this.showEditChild('unborn');
    }

    editChild(child: Child) {
        this.showEditChild(child.isExpecting ? 'unborn' : 'born', child);
    }

    private showEditChild(type: 'unborn' | 'born', child?: Child) {
        const overlay = this.overlayService.openOverlay(RegistrationEditChildComponent);
        overlay.child = child;
        overlay.type = type;
    }
}
