import { AvatarValidatorGoogle } from './avatar-validation-GoogleVision.service';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import getPixels = require('get-pixels');
import sizeOf from 'image-size';

export enum AvatarValidationType {
    noFaces = 'noFaces',
    moreThanOneFace = 'moreThanOneFace',
    smallFace = 'smallFace',
    croppedFace = 'croppedFace',
    angryFace = 'angryFace',
    sunglasses = 'sunglasses',
    explicitContent = 'explicitContent',
    textOverlay = 'textOverlay',
    darkImage = 'darkImage',
}

export interface ValidationResult {
    mandatory: string[];
    optional: string[];
}

export class AvatarValidator {
    static readonly minImageDimension = 500;
    static mandatoryWarnings = [
        AvatarValidationType.croppedFace,
        AvatarValidationType.noFaces,
        AvatarValidationType.sunglasses,
        AvatarValidationType.textOverlay,
    ];

    async validate(base64Image: string) {
        const generalValidationResult = (
            await Promise.all([new AvatarValidatorGoogle().faceValidation(base64Image), AvatarValidator.checkBrightness(base64Image)])
        ).flatMap(i => i);

        return generalValidationResult.reduce(
            (acc, current) => {
                if (AvatarValidator.mandatoryWarnings.includes(current)) {
                    acc.mandatory.push(current);
                } else {
                    acc.optional.push(current);
                }
                return acc;
            },
            { mandatory: [], optional: [] } as ValidationResult,
        );
    }

    static async checkBrightness(base64Image: string) {
        return new Promise<AvatarValidationType[]>((resolve, reject) => {
            const binaryImage = Buffer.from(base64Image, 'base64');
            const imageSize = sizeOf(binaryImage);
            getPixels(binaryImage, `image/${imageSize.type}`, (err, pixels) => {
                if (err) {
                    reject(err);
                } else {
                    const data = pixels.data;
                    let accumulator = 0;
                    for (let x = 0, len = data.length; x < len; x += 4) {
                        Math.max(data[x], data[x + 1], data[x + 2]) < 128 ? accumulator-- : accumulator++;
                    }

                    const accumulatorNormalized =
                        imageSize.width && imageSize.height ? accumulator / (imageSize.width * imageSize.height) : 0;
                    const fuzzy = 0.62;
                    if (accumulatorNormalized + fuzzy < 0) {
                        resolve([AvatarValidationType.darkImage]);
                    } else {
                        resolve([]);
                    }
                }
            });
        });
    }
}
