import { Component, EventEmitter, Input, Output } from '@angular/core';
import { GenericMessageComponent } from 'app/components/conversations/chat/messages/generic-message/generic-message.component';
import { TranslateModule } from '@ngx-translate/core';
import { User } from 'app/models/api/user';
import { BaseMessageComponent } from 'app/components/conversations/chat/messages/base-message.component';

@Component({
    selector: 'safety-tips-message',
    templateUrl: './safety-tips-message.component.html',
    styleUrls: ['./safety-tips-message.component.less'],
    standalone: true,
    imports: [GenericMessageComponent, TranslateModule],
})
export class SafetyTipsMessageComponent extends BaseMessageComponent {
    @Input({ required: true }) askDisableSafetyMessages: boolean;
    @Input({ required: true }) user: User;

    @Output() disableSafetyMessages = new EventEmitter();
    @Output() showSafetyTips = new EventEmitter();
}
