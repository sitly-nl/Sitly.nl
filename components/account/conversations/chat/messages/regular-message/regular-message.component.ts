import { Component, Input } from '@angular/core';
import { GenericMessageComponent } from 'app/components/conversations/chat/messages/generic-message/generic-message.component';
import { MessageAction, MessageType } from 'app/models/api/message';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';
import { User } from 'app/models/api/user';
import { BaseMessageComponent } from 'app/components/conversations/chat/messages/base-message.component';

@Component({
    selector: 'regular-message',
    templateUrl: './regular-message.component.html',
    styleUrls: ['./regular-message.component.less'],
    standalone: true,
    imports: [GenericMessageComponent, SharedModule, TranslateModule],
})
export class RegularMessageComponent extends BaseMessageComponent {
    @Input({ required: true }) user: User;
    MessageAction = MessageAction;

    get isAutoRejection() {
        return this.group.messages[0].type === MessageType.autoRejection;
    }
    get senderFirstName() {
        return this.group.action === MessageAction.received ? this.chatPartner.firstName : this.user.firstName;
    }
}
