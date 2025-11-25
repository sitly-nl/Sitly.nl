import { readFileSync } from 'fs';
import { Request } from 'express';

const regExesData = readFileSync(require.resolve('uap-core/regexes.yaml'), 'utf8');
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-call
const uap = require('uap-ref-impl')(require('yamlparser').eval(regExesData)) as {
    parse: (userAgent: string) => { ua?: { family: string }; os?: { family: string } };
};

export class RequestUtil {
    static userAgentInfo(req: Request) {
        const userAgentString = req.get('User-Agent');
        if (userAgentString?.startsWith('iOS app')) {
            return {
                device: 'mobile',
                platform: 'iOS app',
                os: 'iOS',
            };
        } else if (userAgentString?.startsWith('Android app')) {
            return {
                device: 'mobile',
                platform: 'Android app',
                os: 'Android',
            };
        } else {
            let device: string | undefined;
            let browser: string | undefined;
            let os: string | undefined;
            if (userAgentString) {
                if (userAgentString.match(/Tablet|iPad/i)) {
                    device = 'tablet';
                } else if (
                    userAgentString.match(
                        /Mobile|Windows Phone|Lumia|Android|webOS|iPhone|iPod|Blackberry|PlayBook|BB10|Opera Mini|\bCrMo\/|Opera Mobi/i,
                    )
                ) {
                    device = 'mobile';
                } else {
                    device = 'desktop';
                }

                const parsedUA = uap.parse(userAgentString);
                browser = parsedUA.ua?.family;
                os = parsedUA.os?.family;
            }
            return {
                platform: req.get('x-sitly-platform') ?? '-',
                device,
                browser,
                os,
            };
        }
    }
}
