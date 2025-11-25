import { Environment } from '../env-settings.service';
import { BrandCode } from '../../models/brand-code';
import { CacheItem, CacheService, CachingKeys } from '../cache.service';
import { SentryService } from '../sentry.service';
import { request } from '../../utils/util';
import { GrowthbookApiResponse, GrowthbookEnvironment, GrowthbookProjectId } from './growthbook-types';
import { config } from '../../../config/config';

export class FeaturesService {
    private static growthbookApiUrl = 'https://api.growthbook.io/api/v1/';

    static jobPostingEnabled = !Environment.isProd;
    static connectionInvitesPushesReleaseDate: Date | undefined = undefined;
    static connectionInvitesEnabled(brandCode: BrandCode) {
        return config.getConfig(brandCode).invitesDailyLimit;
    }

    static showRecommendations(brandCode: BrandCode) {
        return config.getConfig(brandCode).showRecommendations || !Environment.isProd;
    }

    static async getFeatures(projectId: GrowthbookProjectId, brandCode: BrandCode) {
        const cachedFeatures = await FeaturesService.getFeaturesFromCache(projectId, brandCode);
        if (cachedFeatures) {
            return cachedFeatures;
        }

        const features = await FeaturesService.getFeaturesFromGrowthbook(projectId, brandCode);
        if (!features) {
            return;
        }
        await FeaturesService.setFeaturesInCache(features, projectId, brandCode);
        return features;
    }

    static async recacheFeatures(projectId: GrowthbookProjectId, brandCode: BrandCode) {
        await FeaturesService.clearFeaturesCache(projectId, brandCode);
        await FeaturesService.getFeatures(projectId, brandCode);
    }

    private static async getFeaturesFromGrowthbook(projectId: GrowthbookProjectId, brandCode: BrandCode) {
        try {
            const rawFeatures = [];
            let hasMore = true;
            let nextOffset = 0;
            while (hasMore) {
                const response = (await request({
                    method: 'GET',
                    url: `${this.growthbookApiUrl}/features`,
                    qs: {
                        projectId,
                        limit: 100,
                        offset: nextOffset,
                    },
                    headers: {
                        Authorization: `Bearer ${Environment.apiKeys.growthbook.api_key}`,
                    },
                    json: true,
                })) as GrowthbookApiResponse;
                const body = response?.body;
                const features = body?.features ?? [];
                rawFeatures.push(...features);
                nextOffset = body?.nextOffset ?? 0;
                hasMore = body?.hasMore === true && nextOffset > 0;
            }
            const currentEnv = Environment.isProd
                ? GrowthbookEnvironment.production
                : Environment.isTest
                  ? GrowthbookEnvironment.acceptance
                  : GrowthbookEnvironment.development;

            const relevantFeatures: Record<string, unknown> = rawFeatures
                .filter(feature => !feature.archived && feature.environments[currentEnv]?.enabled)
                .reduce((prev, curr) => {
                    const definition = curr.environments[currentEnv];
                    const parsedDefinition = JSON.parse(definition?.definition ?? '{}') as Record<string, unknown>;
                    return {
                        ...prev,
                        [curr.id]: parsedDefinition,
                    };
                }, {});
            return relevantFeatures;
        } catch (error) {
            SentryService.captureException(error, 'features.growthbook', brandCode);
            return;
        }
    }

    private static async getFeaturesFromCache(projectId: GrowthbookProjectId, brandCode: BrandCode) {
        try {
            const cacheInstance = await CacheService.getInstance(CacheItem.growthbookFeatures({ key: projectId }));
            return cacheInstance.get();
        } catch (error) {
            SentryService.captureException(error, 'features.cache', brandCode);
        }
    }

    private static async setFeaturesInCache(features: Record<string, unknown>, projectId: GrowthbookProjectId, brandCode: BrandCode) {
        try {
            const cacheInstance = await CacheService.getInstance(CacheItem.growthbookFeatures({ key: projectId }));
            return cacheInstance.set(features);
        } catch (error) {
            SentryService.captureException(error, 'features.cache', brandCode);
        }
    }

    private static async clearFeaturesCache(projectId: GrowthbookProjectId, brandCode: BrandCode) {
        try {
            const cacheInstance = await CacheService.getInstance(CacheItem.growthbookFeatures({ key: projectId }));
            await cacheInstance.delete();
            if (projectId === GrowthbookProjectId.webApp) {
                await CacheService.clearCache(CachingKeys.countrySettings);
            }
        } catch (error) {
            SentryService.captureException(error, 'features.cache', brandCode);
        }
    }
}
