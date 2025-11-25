import { AvatarValidator } from './avatar-validation/avatar-validation.service';
import { Environment } from './env-settings.service';
import * as request from 'request';
import { optionalAwait } from '../utils/util';
import { UserWarningService } from './user-warning.service';
import { createHash } from 'crypto';
import sizeOf from 'image-size';
import { LogService } from './log.service';
import { User } from '../models/user/user.model';
import { Photo } from '../models/photo.model';
import { getModels } from '../sequelize-connections';
import { UnprocessableEntityError } from './errors';
import { StringUtil } from '../utils/string-util';

export type PhotoType = 'avatar' | 'photo';

export class PhotoService {
    static async processAvatar(input: { base64Value: string; validateAvatar: boolean; user: User }) {
        return this.processPhotoInternal({ ...input, type: 'avatar' });
    }

    static async processPhoto(input: { base64Value: string; validateAvatar: boolean; user: User }) {
        return this.processPhotoInternal({ ...input, type: 'photo' });
    }

    private static async processPhotoInternal({
        base64Value,
        type,
        validateAvatar,
        user,
    }: {
        base64Value: string;
        type: PhotoType;
        validateAvatar: boolean;
        user: User;
    }) {
        const brandCode = user.brandCode;
        const buffer = Buffer.from(base64Value, 'base64');

        let dimensions;
        try {
            dimensions = sizeOf(buffer);
        } catch {
            throw new UnprocessableEntityError({
                code: 'INVALID_FORMAT',
                title: 'Invalid avatar',
                source: {
                    parameter: 'avatar',
                },
            });
        }
        if (dimensions?.type !== 'jpg') {
            throw new UnprocessableEntityError({
                code: 'INVALID_FORMAT',
                title: 'Invalid avatar',
                source: {
                    parameter: 'avatar',
                },
            });
        }
        const dimensionDiff = Math.abs((dimensions.width ?? 0) - (dimensions.height ?? 0));
        if (dimensionDiff > 2) {
            throw new UnprocessableEntityError({
                code: 'INVALID_DIMENSIONS',
                title: 'Invalid avatar',
                source: {
                    parameter: 'avatar',
                },
            });
        }

        if (validateAvatar === true) {
            const validationResponse = await new AvatarValidator().validate(base64Value);
            if (validationResponse.mandatory.length > 0 || validationResponse.optional.length > 0) {
                throw new UnprocessableEntityError({
                    code: 'INVALID_VALUE',
                    title: 'Avatar validation failed',
                    source: {
                        parameter: 'avatar',
                    },
                    meta: validationResponse,
                });
            }
        }

        let photoToReturn: Photo | undefined;

        if (type === 'avatar') {
            try {
                const oldAvatarUrl = user.getAvatarUrl();
                await new Promise((resolve, reject) => {
                    const url = `${Environment.apiKeys.cdn_url}/uploadavatar.php`;
                    const requestOptions = {
                        auth: {
                            user: Environment.apiKeys.auth.cdn.name,
                            pass: Environment.apiKeys.auth.cdn.pass,
                        },
                    };

                    const uniqueId = `${user.customUser.webuser_url}${brandCode}${new Date().getTime()}${Math.random()}`;
                    const md5 = createHash('md5').update(uniqueId).digest('hex');
                    const avatarName = `${StringUtil.randomString(1)}${md5.substring(0, 31)}`;

                    const avatarRequest = request.post(url, requestOptions, (error: Error, _response, _body) => {
                        if (error) {
                            return reject(error);
                        }
                        user.customUser.avatar = avatarName;
                        resolve(avatarName);
                    });

                    const form = avatarRequest.form();

                    form.append('brandCode', brandCode);
                    form.append('avatar', buffer, {
                        filename: `${avatarName}-large.jpg`,
                        contentType: 'image/jpeg',
                    });
                }).then(async () => {
                    await PhotoService.deleteUserAvatar(user, oldAvatarUrl);
                });
            } catch (error) {
                throw new UnprocessableEntityError({
                    code: (error as Error).message,
                    title: 'Invalid avatar',
                    source: {
                        parameter: 'avatar',
                    },
                });
            }
        } else {
            const fileName = await new Promise<string>((resolve, reject) => {
                const url = `${Environment.apiKeys.cdn_url}/uploadphotos.php`;
                const requestOptions = {
                    auth: {
                        user: Environment.apiKeys.auth.cdn.name,
                        pass: Environment.apiKeys.auth.cdn.pass,
                    },
                };
                const photosRequest = request.post(url, requestOptions, (error: Error, response, body) => {
                    if (error) {
                        LogService.log({
                            brandCode: user.brandCode,
                            label: 'uploadPhoto.photo.failure',
                            user,
                            details: error as never,
                        });
                        reject(error);
                    } else {
                        resolve(body as string);
                    }
                });

                const form = photosRequest.form();
                form.append('webuser', user.customUser.webuser_url);
                form.append('brandCode', brandCode);
                form.append('photos', buffer, {
                    filename: 'photo.jpg',
                    contentType: 'image/jpeg',
                });
            });

            if (fileName) {
                let maxPhotoOrder: number | undefined;
                await user.customUser.reload({ include: 'photos' });
                user.customUser.photos?.forEach(item => {
                    if (item.instance_order > (maxPhotoOrder ?? -1)) {
                        maxPhotoOrder = item.instance_order;
                    }
                });

                photoToReturn = await getModels(brandCode).Photo.create({
                    photo: fileName,
                    webuser_id: user.webuser_id,
                    instance_order: maxPhotoOrder === undefined ? 0 : maxPhotoOrder + 1,
                });
            }
        }

        // background checks
        const performAutoMLValidation = () => {
            // --- Google started charging us a lot for autoML, disabling until we have a cheaper solution --- //
            // switch (req.brandCode) {
            //     case BrandCode.argentina:
            //     case BrandCode.brazil:
            //     case BrandCode.colombia:
            //     case BrandCode.mexico:
            //         return;
            // }
            // req.user.customUser.update({ avatar_overlay: AvatarOverlayType.processing });
            // new AvatarValidatorGoogleAutoML().validate(avatar).then(result => {
            //     req.user.customUser.update({
            //         avatar_overlay: result.length > 0 ? AvatarOverlayType.socialFilter : undefined
            //     });
            // });
        };

        if (validateAvatar) {
            // we've caught nudity in check before saving avatar, no needs to check it again
            performAutoMLValidation();
        } else {
            const performFullValidation = async () => {
                const hasWarnings = await UserWarningService.processAvatar(user, base64Value, photoToReturn);
                if (!hasWarnings && !user.isParent) {
                    performAutoMLValidation();
                }
            };
            await optionalAwait(performFullValidation());
        }

        return photoToReturn;
    }

    static async deleteUserAvatar(user: User, avatarUrl = user?.getAvatarUrl()) {
        const avatarName = avatarUrl?.substring(avatarUrl.lastIndexOf('/') + 1, avatarUrl.lastIndexOf('-'));
        if (!avatarName || !user) {
            return;
        }
        const url = `${Environment.apiKeys.cdn_url}/deleteavatar-new.php`;
        return this.cdnRequest(user, url, {
            brandCode: user.brandCode,
            avatarName,
        });
    }

    static async deleteUserPhotos(user: User, photos?: Photo[]) {
        const url = `${Environment.apiKeys.cdn_url}/deletephotos-new.php`;
        const cdnRes = await this.cdnRequest(user, url, {
            brandCode: user.brandCode,
            userUrl: user.customUser.webuser_url,
            photosUrls: photos?.map(photo => photo.photo).join(',') ?? '',
        });
        await user.sequelize.models.Photo.destroy({
            where: photos ? { instance_id: photos.map(photo => photo.instance_id) } : { webuser_id: user.webuser_id },
        });
        return cdnRes;
    }

    private static async cdnRequest(user: User, url: string, formFields: Record<string, string>) {
        return new Promise<string>((resolve, reject) => {
            const requestOptions = {
                auth: {
                    user: Environment.apiKeys.auth.cdn.name,
                    pass: Environment.apiKeys.auth.cdn.pass,
                },
            };

            if (Environment.isApiTests) {
                resolve(
                    JSON.stringify({
                        url,
                        formFields,
                        requestOptions,
                    }),
                );
                return;
            }

            const cdnRequest = request.post(url, requestOptions, (error: Error, response, body) => {
                if (error) {
                    LogService.log({
                        brandCode: user.brandCode,
                        label: `${url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('.'))}.failure`,
                        user,
                        details: error as never,
                    });
                    reject(error);
                } else {
                    resolve(body as string);
                }
            });
            const form = cdnRequest.form();
            Object.keys(formFields).forEach(key => form.append(key, formFields[key]));
        });
    }
}
