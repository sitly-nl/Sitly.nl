import { NgModule } from '@angular/core';
import { SharedModule } from 'modules/shared/shared.module';
import { FacebookAlbumItemComponent } from 'modules/facebook/facebook-album-item/facebook-album-item.component';
import { FacebookAlbumComponent } from 'modules/facebook/facebook-album/facebook-album.component';
import { FacebookRoutingModule } from 'modules/facebook/facebook-routing.module';
import { FacebookPhotosComponent } from 'modules/facebook/facebook-photos/facebook-photos.component';

@NgModule({
    imports: [SharedModule, FacebookRoutingModule, FacebookAlbumItemComponent, FacebookAlbumComponent, FacebookPhotosComponent],
})
export default class FacebookModule {}
