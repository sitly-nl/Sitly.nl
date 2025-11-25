import { IncomingHttpHeaders } from 'http';
import { request, Util } from '../utils/util';
import { Constants } from '../constants';

class CacheItem {
    lastAppVersionCheck = 0;
    version: string;
}

export class CheckAppVersionService {
    private cachedItems: Record<string, CacheItem | undefined> = {};

    async hasUpdate(headers: IncomingHttpHeaders) {
        let hasMajorUpdate = false;
        let hasUpdate = false;
        const userAgent = headers['user-agent'] ?? '';

        const matches = /\b\d+\.\d+\.?\d*/.exec(userAgent);
        const currentVersion = matches?.[0];

        if (currentVersion) {
            if (Util.isIOSApp(headers)) {
                const storeVersion = await this.iOSAppVersion(userAgent);
                const storeMajorVersion = storeVersion?.split('.')[0];
                if ((storeMajorVersion ?? 0) > (currentVersion ?? 0)) {
                    hasMajorUpdate = true;
                }
                hasUpdate = storeVersion ? this.isVersionBigger(storeVersion, currentVersion) : false;
            } else if (Util.isAndroidApp(headers)) {
                hasUpdate = this.isVersionBigger('1.27.0', currentVersion); // for version >= 1.27.0 we have native automatic Android updates
            }
        }

        return {
            hasMajorUpdate,
            hasUpdate,
        };
    }

    private async iOSAppVersion(userAgent: string) {
        let cacheItem = this.cachedItems[userAgent];
        if (cacheItem) {
            const ttl = 10 * 60 * 1000;
            const isOutdated = cacheItem.lastAppVersionCheck < Date.now() - ttl;
            if (isOutdated) {
                cacheItem = undefined;
            }
        }
        if (!cacheItem) {
            const version = await this.loadIOSAppVersion();
            if (version) {
                cacheItem = {
                    version,
                    lastAppVersionCheck: Date.now(),
                };
                this.cachedItems[userAgent] = cacheItem;
            }
        }
        if (cacheItem) {
            cacheItem.lastAppVersionCheck = Date.now();
        }
        return cacheItem?.version;
    }

    private async loadIOSAppVersion() {
        const res = await request({
            url: `https://itunes.apple.com/nl/lookup?bundleId=${Constants.apple.bundleId}`,
            json: {},
        });
        return res.body?.results?.[0]?.version as string | undefined;
    }

    private isVersionBigger(v1: string, v2: string) {
        const v1parts = v1.split('.');
        const v2parts = v2.split('.');
        const maxLength = Math.max(v1parts.length, v2parts.length);
        for (let i = 0; i < maxLength; i++) {
            const v1part = v1parts[i] ?? 0;
            const v2part = v2parts[i] ?? 0;
            if (v1part !== v2part) {
                return v1part > v2part;
            }
        }
        return false;
    }
}
