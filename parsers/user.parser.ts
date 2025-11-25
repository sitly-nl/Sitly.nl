import { BaseParser } from 'app/parsers/base-parser';
import { User } from 'app/models/api/user';
import { UploadAvatarErrorMeta, AvatarNonCriticalErrorType, AvatarCriticalErrorType } from 'app/models/api/photo';
import { PSPType } from 'app/models/api/payment';
import { ServerResponseData } from 'app/models/api/response';
import { ParserMap } from 'app/parsers/response-parser';

export class UserParser extends BaseParser {
    parse(data: ServerResponseData, included: ServerResponseData[], parsersMap: ParserMap) {
        const user = super.parseBase(User, data);
        if (user.subscriptionPsp) {
            user.subscriptionPsp = user.subscriptionPsp.toLowerCase() as PSPType;
        }
        this.parseAvatarErrors(user, data);
        user.children = this.getRelationship('children', data, included, parsersMap) ?? [];
        user.similarUsers = this.getRelationship('similar', data, included, parsersMap) ?? [];
        user.references = this.getRelationship('references', data, included, parsersMap) ?? [];
        user.recommendations = this.getRelationship('recommendations', data, included, parsersMap) ?? [];
        user.photos = this.getRelationship('photos', data, included, parsersMap) ?? [];
        user.subscription = this.getRelationship('subscription', data, included, parsersMap);
        return user;
    }

    private parseAvatarErrors(user: User, data: ServerResponseData) {
        if (!data?.attributes?.avatarWarnings) {
            return;
        }

        user.avatarWarnings = JSON.parse((data.attributes.avatarWarnings as string) ?? '') as UploadAvatarErrorMeta;

        if (user.avatarWarnings.mandatory?.[0]) {
            switch (user.avatarWarnings.mandatory?.[0]) {
                case AvatarCriticalErrorType.croppedFace:
                    user.unsuitablePhotoReason = 'profile.photoHasCroppedFace';
                    break;
                case AvatarCriticalErrorType.noFaces:
                    user.unsuitablePhotoReason = 'profile.photoHasNoFaces';
                    break;
                case AvatarCriticalErrorType.sunglasses:
                    user.unsuitablePhotoReason = 'profile.photoHasSunglasses';
                    break;
                case AvatarCriticalErrorType.textOverlay:
                    user.unsuitablePhotoReason = 'profile.photoHasTextOverlay';
                    break;
            }
        } else {
            switch (user.avatarWarnings.optional?.[0]) {
                case AvatarNonCriticalErrorType.filterOverlay:
                    user.unsuitablePhotoReason = 'profile.photoHasSocialMediaFilter';
                    break;
                case AvatarNonCriticalErrorType.angryFace:
                    user.unsuitablePhotoReason = 'profile.photoHasAngryFace';
                    break;
                case AvatarNonCriticalErrorType.darkImage:
                    user.unsuitablePhotoReason = 'profile.photoHasDarkImage';
                    break;
                case AvatarNonCriticalErrorType.explicitContent:
                    user.unsuitablePhotoReason = 'profile.photoHasExplicitContent';
                    break;
                case AvatarNonCriticalErrorType.moreThanOneFace:
                    user.unsuitablePhotoReason = 'profile.photoHasMoreThanOneFace';
                    break;
                case AvatarNonCriticalErrorType.overexposure:
                    user.unsuitablePhotoReason = 'profile.photoHasOverexposure';
                    break;
                case AvatarNonCriticalErrorType.smallFace:
                    user.unsuitablePhotoReason = 'profile.photoHasSmallFace';
                    break;
            }
        }
    }
}
