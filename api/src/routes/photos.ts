import { SitlyRouter } from './sitly-router';
import { Response } from 'express';
import { BaseRoute } from './route';
import { Serializer as JSONAPISerializer } from 'jsonapi-serializer';
import { forbiddenError, notFoundError, serverError } from '../services/errors';
import { PhotoService } from '../services/photo.service';
import { PhotoResponse } from '../models/serialize/photo-response';
import { UserWarningType } from '../models/user-warning.model';
import { getModels } from '../sequelize-connections';
import { User } from '../models/user/user.model';
import { Photo } from '../models/photo.model';
import { UserRequest } from '../services/auth.service';

const createSerializer = (user: User) => {
    const serializer = new JSONAPISerializer('photos', {
        attributes: PhotoResponse.keys,
        transform: (photo: Photo) => PhotoResponse.instance(photo, user),
        dataLinks: {
            photo: (photo: PhotoResponse) => photo.link,
        },
    });
    return serializer;
};
export class PhotosRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.get<UserRequest>('/users/:userUrl/photos', (req, res) => {
            return new PhotosRoute().index(req, res);
        });

        router.post<UserRequest>('/users/me/photos', (req, res) => {
            if (req.body?.order) {
                return new PhotosRoute().reorder(req, res);
            } else {
                return new PhotosRoute().create(req, res);
            }
        });

        router.delete<UserRequest>('/users/me/photos/:photoId', (req, res) => {
            return new PhotosRoute().delete(req, res);
        });
    }

    async index(req: UserRequest, res: Response) {
        let user;

        if (req.params.userUrl === 'me') {
            user = req.user;
        } else {
            user = await getModels(req.brandCode).User.byUserUrl(req.params.userUrl);
            if (!user) {
                return notFoundError({ res, title: 'User not found' });
            }
        }

        await user.customUser.reload({ include: 'photos' });
        res.status(200);
        res.json(createSerializer(req.user).serialize(user.customUser.photos));
    }

    async reorder(req: UserRequest, res: Response): Promise<void> {
        req.checkBody('order').isArray().withMessage({
            code: 'INVALID_FORMAT',
            title: 'order must be an array of photo ids',
        });

        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }

        await req.user.customUser.loadRelationIfEmpty('photos');
        const photos = req.user.customUser.photos ?? [];

        const photosOrder = (req.body.order as string[]).map(item => parseInt(item, 10));
        let highestIndex = 0;
        photosOrder.forEach((photoId: number, index: number) => {
            const photo = photos.find(photo => photo.instance_id === +photoId);
            if (photo) {
                photo.instance_order = index;
                highestIndex = index;
            }
        });

        photos.forEach((photo, index) => {
            if (!photosOrder.includes(photo.instance_id)) {
                photo.instance_order = highestIndex + index + 1;
            }
        });

        await Promise.all(photos.map(photo => photo.save()));
        await req.user.customUser.reload({ include: 'photos' });
        res.json(createSerializer(req.user).serialize(req.user.customUser.photos));
    }

    async create(req: UserRequest, res: Response) {
        req.sanitizeBody('photo').trim();
        req.checkBody('photo').isBase64().withMessage({
            code: 'INVALID_FORMAT',
            title: 'Photo must be base64-encoded',
        });
        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }

        try {
            const photo = await PhotoService.processPhoto({
                base64Value: req.body.photo as string,
                validateAvatar: req.body.validateAvatar === true,
                user: req.user,
            });
            res.status(201);
            res.json(createSerializer(req.user).serialize(photo));
        } catch (error) {
            return this.handleError(req, res, error);
        }
    }

    async delete(req: UserRequest, res: Response) {
        try {
            // TODO: delete from cdn
            const models = getModels(req.brandCode);
            const photo = await models.Photo.byId(req.params.photoId);
            if (!photo) {
                return notFoundError({ res, title: 'Photo not found' });
            }

            if (photo.webuser_id !== req.user.webuser_id) {
                return forbiddenError({ res, code: 'INVALID_AUTH', title: 'This is not yours to delete' });
            }

            await models.UserWarning.destroy({
                where: {
                    webuser_id: req.user.webuser_id,
                    warning_type: UserWarningType.avatar,
                    photo_id: photo.instance_id,
                },
            });

            await photo.destroy();
            res.status(204).json('');
        } catch (error) {
            serverError(req, res, error as Error);
        }
    }
}
