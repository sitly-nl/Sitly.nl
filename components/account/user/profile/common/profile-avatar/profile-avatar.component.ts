import { Component, EventEmitter, Output } from '@angular/core';
import { ProfileBlockComponent } from 'app/components/user/profile/common/profile-block/profile-block.component';
import { OnlineAgoFormattedPipe } from 'app/pipes/online-ago-formatted.pipe';
import { NgClass, AsyncPipe } from '@angular/common';
import { UserPhotosComponent } from 'app/components/user/profile/common/user-photos/user-photos.component';

@Component({
    selector: 'profile-avatar',
    templateUrl: './profile-avatar.component.html',
    styleUrls: ['./profile-avatar.component.less'],
    standalone: true,
    imports: [UserPhotosComponent, NgClass, AsyncPipe, OnlineAgoFormattedPipe],
})
export class ProfileAvatarComponent extends ProfileBlockComponent {
    @Output() reportPhoto = new EventEmitter();

    onReportPhoto() {
        this.reportPhoto.emit();
    }
}
