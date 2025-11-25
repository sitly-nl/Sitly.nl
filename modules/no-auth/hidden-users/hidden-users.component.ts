import { Component, HostListener, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { HiddenUserService } from 'app/services/hidden-user.service';
import { User } from 'app/models/api/user';
import { BaseComponent } from 'app/components/base.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';
import { UserCardComponent } from 'app/components/user/user-card/user-card.component';
import { ToolbarItem } from 'modules/shared/components/toolbar/toolbar.component';

@Component({
    selector: 'hidden-users',
    templateUrl: './hidden-users.component.html',
    styleUrls: ['./hidden-users.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [SharedModule, UserCardComponent, TranslateModule],
})
export default class HiddenUsersComponent extends BaseComponent {
    readonly hiddenUserService = inject(HiddenUserService);

    readonly hiddenUsers = toSignal(this.hiddenUserService.hiddenUsers, { initialValue: [] });
    readonly hasHiddenUsers = computed(() => this.hiddenUsers().length > 0);

    ToolbarItem = ToolbarItem;

    @HostListener('document:keydown.escape', ['$event']) onKeydownHandler(_event: KeyboardEvent) {
        this.back();
    }

    unhideUser(user: User) {
        this.hiddenUserService.unhide(user);
    }
}
