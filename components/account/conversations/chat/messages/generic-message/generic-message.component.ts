import { Component, Input } from '@angular/core';
import { MessageAction } from 'app/models/api/message';
import { PhoneLinkPipe } from 'app/pipes/phone-link.pipe';
import { Nl2br } from 'app/pipes/nl2br.pipe';
import { TranslateModule } from '@ngx-translate/core';
import { FormatPipeModule } from 'ngx-date-fns';
import { SharedModule } from 'modules/shared/shared.module';
import { BaseMessageComponent } from 'app/components/conversations/chat/messages/base-message.component';

@Component({
    selector: 'generic-message',
    templateUrl: './generic-message.component.html',
    styleUrls: ['./generic-message.component.less'],
    standalone: true,
    imports: [SharedModule, FormatPipeModule, TranslateModule, Nl2br, PhoneLinkPipe],
})
export class GenericMessageComponent extends BaseMessageComponent {
    @Input({ required: true }) messageHeader: string;

    MessageAction = MessageAction;
}
