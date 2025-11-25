import { FacebookAlbumInterface } from 'app/models/facebook-types';
import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'facebook-album-item',
    templateUrl: './facebook-album-item.component.html',
    styleUrls: ['./facebook-album-item.component.less'],
    standalone: true,
    imports: [TranslateModule],
})
export class FacebookAlbumItemComponent {
    @Input({ required: true }) album: FacebookAlbumInterface;
}
