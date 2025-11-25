import * as request from 'request';
import * as jsonwebtoken from 'jsonwebtoken';
import { readFileSync } from 'fs';
import { Constants } from '../constants';

export class AppleAuth {
    private static clientId(iOSApp: boolean) {
        const webClientId = 'com.sitly.signInWithApple'; // the Services ID
        return iOSApp ? Constants.apple.bundleId : webClientId;
    }

    private static secret(iOSApp: boolean) {
        const key = readFileSync('./appleSignUpAuthKey.p8');

        const keyId = 'J48AJ4F37Q';

        return jsonwebtoken.sign({}, key, {
            algorithm: 'ES256',
            expiresIn: '1d',
            audience: 'https://appleid.apple.com',
            subject: AppleAuth.clientId(iOSApp),
            issuer: Constants.apple.teamId,
            keyid: keyId,
        });
    }

    static async validateCode(code: string, iOSApp: boolean) {
        const options = {
            method: 'POST',
            url: 'https://appleid.apple.com/auth/token',
            form: {
                client_id: AppleAuth.clientId(iOSApp),
                client_secret: AppleAuth.secret(iOSApp),
                code,
                grant_type: 'authorization_code',
            },
        };
        return new Promise<string | undefined>((resolve, reject) => {
            request(options, (error: Error, response) => {
                if (error) {
                    reject(error);
                } else {
                    const result = JSON.parse(response.body as string) as Record<string, unknown>;
                    if (result.error) {
                        reject(result.error as Error);
                    } else {
                        resolve(result?.id_token as string);
                    }
                }
            });
        });
    }
}
