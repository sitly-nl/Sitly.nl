import { Photo } from '../photo.model';
import { User } from '../user/user.model';

export class PhotoResponse {
    static keys: (keyof PhotoResponse)[] = ['id', 'fileName'];

    id = this.photo.instance_id;
    fileName = this.photo.photo;
    link = this.photo.link(this.user.customUser.webuser_url);

    private constructor(
        private photo: Photo,
        private user: User,
    ) {}

    static instance(photo: Photo, user: User) {
        return new PhotoResponse(photo, user);
    }
}
