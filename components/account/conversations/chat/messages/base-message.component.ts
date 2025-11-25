import { Component, Input } from '@angular/core';
import { User } from 'app/models/api/user';
import { MessagesGroup } from 'app/models/messages-group';

@Component({
    template: '',
})
export class BaseMessageComponent {
    @Input({ required: true }) chatPartner: User;
    @Input({ required: true }) group: MessagesGroup;
    @Input({ required: true }) previousGroupFormattedDate?: string;
}
