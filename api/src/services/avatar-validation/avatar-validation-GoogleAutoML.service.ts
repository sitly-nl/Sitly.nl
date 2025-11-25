/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Environment } from '../env-settings.service';

interface Payload {
    displayName: string;
    classification: {
        score: number;
    };
}

export class AvatarValidatorGoogleAutoML {
    async validate(base64: string) {
        return new Promise<string[]>((resolve, reject) => {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const automl = require('@google-cloud/automl');

            const projectId = 'overlaydetection';
            const keyFilename = './overlayDetection-key.json';

            const client = new automl.PredictionServiceClient({
                projectId,
                keyFilename,
            });

            const request = {
                name: client.modelPath(projectId, 'us-central1', Environment.apiKeys.google_autoML_model_id),
                payload: {
                    image: {
                        imageBytes: base64,
                    },
                },
            };
            client
                .predict(request)
                .then((responses: { payload: Payload[] }[]) => {
                    const payload = responses?.[0]?.payload ?? [];
                    const thresholds: Record<string, number> = {
                        crownPinkHearts: 0.91,
                        snapchatGlasses: 0.9,
                        crownFlowers: 0.8,
                        flowerOnSide: 0.8,
                    };
                    const response = payload
                        .filter(item => {
                            const displayName = item?.displayName ?? '';
                            const threshold = thresholds[displayName];
                            return item?.classification?.score > (threshold || 0);
                        })
                        .map(item => `${item?.displayName}`)
                        .filter(item => item !== 'None_of_the_above');
                    resolve(response);
                })
                .catch((err: Error) => {
                    console.error(err);
                    reject(err);
                });
        });
    }
}
