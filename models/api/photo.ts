import { BaseApiModel } from 'app/models/api/response';

export class Photo extends BaseApiModel {
    fileName: string;
    description: null;

    declare links: {
        photo: string;
    };
}

export interface UploadAvatarErrorInterface {
    code: string;
    title: string;
    source: {
        parameter: string;
    };
    meta: UploadAvatarErrorMeta;
}

export interface UploadAvatarErrorMeta {
    mandatory: AvatarCriticalErrorType[];
    optional: AvatarNonCriticalErrorType[];
}

export enum AvatarCriticalErrorType {
    croppedFace = 'croppedFace',
    noFaces = 'noFaces',
    sunglasses = 'sunglasses',
    textOverlay = 'textOverlay',
}

export enum AvatarNonCriticalErrorType {
    moreThanOneFace = 'moreThanOneFace',
    smallFace = 'smallFace',
    angryFace = 'angryFace',
    overexposure = 'overexposure',
    explicitContent = 'explicitContent',
    darkImage = 'darkImage',
    filterOverlay = 'filterOverlay',
}

export enum PhotoUploadPurpose {
    avatar = 'avatar',
    photo = 'photo',
}
