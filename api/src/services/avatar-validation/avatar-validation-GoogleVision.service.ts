import { TextAnalyzerService } from './../text-analyzer.service';
import { AvatarValidationType } from './avatar-validation.service';
import { Environment } from '../env-settings.service';
import { request } from '../../utils/util';
import sizeOf from 'image-size';

interface AvatarValidatorGoogleResponse {
    responses?: {
        safeSearchAnnotation?: {
            adult: unknown;
            racy: unknown;
        };
        faceAnnotations?: {
            fdBoundingPoly?: { vertices: { x: unknown; y: unknown }[] };
            angerLikelihood: unknown;
        }[];
        labelAnnotations?: {
            description: string;
            score: number;
        }[];
        textAnnotations?: {
            description: string;
            boundingPoly?: { vertices?: { y: number }[] };
        }[];
    }[];
}
export class AvatarValidatorGoogle {
    async faceValidation(base64Image: string) {
        const res = await this.runRequest(base64Image, [
            { type: 'FACE_DETECTION' },
            { type: 'LABEL_DETECTION' },
            { type: 'SAFE_SEARCH_DETECTION' },
            { type: 'TEXT_DETECTION' },
        ]);
        const body = res.body as AvatarValidatorGoogleResponse;

        const result: AvatarValidationType[] = [];

        if (!body?.responses) {
            return result;
        }

        // Explicit content
        const safeSearchAnnotation = body.responses[0]?.safeSearchAnnotation;
        const adult = safeSearchAnnotation?.adult;
        const racy = safeSearchAnnotation?.racy;
        if ((adult === 'POSSIBLE' || adult === 'LIKELY' || adult === 'VERY_LIKELY') && racy === 'VERY_LIKELY') {
            result.push(AvatarValidationType.explicitContent);
        }

        const faceAnnotations = body.responses[0]?.faceAnnotations;
        if (!Array.isArray(faceAnnotations)) {
            result.push(AvatarValidationType.noFaces);
            return result;
        }

        // Number of faces
        const facesCount = faceAnnotations.length;
        if (facesCount === 0) {
            result.push(AvatarValidationType.noFaces);
            return result;
        } else if (facesCount > 1) {
            result.push(AvatarValidationType.moreThanOneFace);
            return result;
        }

        const faceInfo = faceAnnotations[0];

        // Face cropped
        const binaryImage = Buffer.from(base64Image, 'base64');
        const boundingPoly = faceInfo?.fdBoundingPoly?.vertices;
        const imageSize = sizeOf(binaryImage);
        if (boundingPoly && imageSize) {
            const abscissas = boundingPoly.map(item => Number(item?.x)).filter(item => item);
            const abscissaDelta = Math.max(...abscissas) - Math.min(...abscissas);
            const ordinates = boundingPoly.map(item => Number(item?.y)).filter((item: unknown) => item);
            const ordinateDelta = Math.max(...ordinates) - Math.min(...ordinates);

            if (abscissaDelta < 1 || ordinateDelta < 1) {
                result.push(AvatarValidationType.croppedFace);
            } else if (imageSize.width && abscissaDelta / imageSize.width < 0.22) {
                result.push(AvatarValidationType.smallFace);
                return result;
            }
        }

        const angry = faceInfo?.angerLikelihood;
        if (angry === 'LIKELY' || angry === 'VERY_LIKELY') {
            result.push(AvatarValidationType.angryFace);
        }

        // Labels
        const labelAnnotations = body.responses[0]?.labelAnnotations;
        const sunglasses = labelAnnotations?.find(item => item?.description?.toLowerCase() === 'sunglasses');
        if ((sunglasses?.score ?? 0) >= 0.8) {
            result.push(AvatarValidationType.sunglasses);
        }

        // Text
        const textAnnotations = body.responses[0]?.textAnnotations;
        if (textAnnotations && textAnnotations?.length > 0) {
            for (const annotation of textAnnotations) {
                const ordinates = (annotation?.boundingPoly?.vertices ?? []).map(element => element?.y);
                const lineHeight = Math.max(...ordinates) - Math.min(...ordinates);
                if (imageSize.height && lineHeight / imageSize.height > 0.03) {
                    if (TextAnalyzerService.hasPhoneNumber(annotation?.description ?? '', [])) {
                        result.push(AvatarValidationType.textOverlay);
                        break;
                    }
                }
            }
        }

        return result;
    }

    async nudityValidation(base64Image: string) {
        const res = await this.runRequest(base64Image, [{ type: 'SAFE_SEARCH_DETECTION' }]);
        const body = res.body as AvatarValidatorGoogleResponse;

        const safeSearchAnnotation = body?.responses?.[0]?.safeSearchAnnotation;
        const adult = safeSearchAnnotation?.adult;
        const racy = safeSearchAnnotation?.racy;
        const detected = (adult === 'POSSIBLE' || adult === 'LIKELY' || adult === 'VERY_LIKELY') && racy === 'VERY_LIKELY';
        return {
            detected,
            adult,
            racy,
        };
    }

    async textOverlayValidationMY(base64Image: string) {
        const res = await this.runRequest(base64Image, [{ type: 'TEXT_DETECTION' }]);
        const body = res.body as AvatarValidatorGoogleResponse;

        const textAnnotations = body.responses?.[0]?.textAnnotations as {
            description: string;
            boundingPoly?: { vertices?: { y: number }[] };
        }[];
        if (textAnnotations?.length > 0) {
            const binaryImage = Buffer.from(base64Image, 'base64');
            const imageSize = sizeOf(binaryImage);
            for (const annotation of textAnnotations) {
                const ordinates = (annotation?.boundingPoly?.vertices ?? []).map((element: { y: number }) => element?.y);
                const lineHeight = Math.max(...ordinates) - Math.min(...ordinates);
                if (imageSize.height && lineHeight / imageSize.height > 0.03) {
                    if ((annotation?.description ?? '').length >= 10) {
                        return { detected: true };
                    }
                }
            }
        }

        return { detected: false };
    }

    private async runRequest(base64Image: string, features: unknown[]) {
        return request({
            method: 'POST',
            url: `https://vision.googleapis.com/v1/images:annotate?key=${Environment.apiKeys.google_vision}`,
            json: {
                requests: [
                    {
                        image: {
                            content: base64Image,
                        },
                        features,
                    },
                ],
            },
        });
    }
}
