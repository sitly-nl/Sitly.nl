import { createClient, RedisClientType } from '@redis/client';
import { Request } from 'express';
import { Environment } from './env-settings.service';
import { CountryCode } from 'aws-sdk/clients/route53domains';
import { GrowthbookProjectId } from './features/growthbook-types';

enum CacheAdapterType {
    redis = 'redis',
    memory = 'memory',
}

export enum CachingKeys {
    // Test
    keyTestsRedis = 'keyTestsRedis',
    keyTestsInMemory = 'keyTestsInMemory',
    //
    countrySettings = 'countrySettings',
    sensitivePhrase = 'sensitivePhrase',
    sensitivePhraseExclusion = 'sensitivePhraseExclusion',
    translations = 'translations',
    trustpilot = 'trustpilot',
    addressComponents = 'addressComponents',
    geocode = 'geocode',
    growthbook = 'growthbook',
    jobXmlUsers = 'jobXmlUsers',
}

export interface CacheAdapterInterface {
    get<T = unknown>(): Promise<T | undefined>;
    set(value: unknown): Promise<unknown>;
    delete(): Promise<unknown>;
}

export interface RecacheRequestOptions {
    url: string;
    json: {
        action: 'recache';
        webuserUrls: string[];
    };
}

export class CacheItem {
    static testRedis = new CacheItem(60, CacheAdapterType.redis, CachingKeys.keyTestsRedis);
    static testInMemory = new CacheItem(60, CacheAdapterType.memory, CachingKeys.keyTestsInMemory);

    fullKey =
        `api.${this.key}` +
        (this.keyParams
            ? `_${Object.keys(this.keyParams)
                  .sort((a, b) => a.localeCompare(b))
                  .map(key => `${key}_${this.keyParams?.[key]}`)
                  .join('_')}`
            : '');

    constructor(
        public ttl: number,
        public adapterType: CacheAdapterType,
        private key: CachingKeys,
        private keyParams?: Record<string, string | number>,
    ) {}

    static countrySettings(keyParams: { brandCode: string; localeCode: string; host: string }) {
        return new CacheItem(24 * 60 * 60, CacheAdapterType.redis, CachingKeys.countrySettings, keyParams);
    }
    static sensitivePhrase(keyParams: { key: 'all'; database: string }) {
        return new CacheItem(24 * 60 * 60, CacheAdapterType.redis, CachingKeys.sensitivePhrase, keyParams);
    }
    static sensitivePhraseExclusion(keyParams: { key: 'all'; database: string }) {
        return new CacheItem(24 * 60 * 60, CacheAdapterType.redis, CachingKeys.sensitivePhraseExclusion, keyParams);
    }
    static translations(keyParams: Record<string, string | number>) {
        return new CacheItem(2 * 60 * 60, CacheAdapterType.redis, CachingKeys.translations, keyParams);
    }
    static trustpilot(keyParams: { key: 'token' }) {
        return new CacheItem(60 * 60, CacheAdapterType.redis, CachingKeys.trustpilot, keyParams);
    }
    static addressComponents(keyParams: { key: 'places'; brandCode: string; locale: string; keyword: string }) {
        return new CacheItem(30 * 24 * 60 * 60, CacheAdapterType.redis, CachingKeys.addressComponents, keyParams);
    }
    static geocode(keyParams: { key: 'coordByPostalCode'; countryCode: CountryCode; postalCode: string }) {
        return new CacheItem(10 * 60, CacheAdapterType.redis, CachingKeys.geocode, keyParams);
    }
    static growthbookFeatures(keyParams: { key: GrowthbookProjectId }) {
        return new CacheItem(24 * 60 * 60, CacheAdapterType.redis, CachingKeys.growthbook, keyParams);
    }
    static jobXmlSearchUsers(keyParams: { key: 'general'; brandCode: string }) {
        return new CacheItem(60 * 60, CacheAdapterType.redis, CachingKeys.jobXmlUsers, keyParams);
    }
}

export class CacheService {
    static wantsCache(req: Request) {
        return req.header('cache-control')?.toLowerCase() !== 'no-cache';
    }

    static async clearCache(key: CachingKeys) {
        // TODO: clear in MemoryCacheAdapter
        return RedisCacheAdapter.clear(key);
    }

    static async getInstance(options: CacheItem, clearCache = false) {
        let service;
        switch (options.adapterType) {
            case CacheAdapterType.redis:
                service = await RedisCacheAdapter.create(options);
                break;
            case CacheAdapterType.memory:
                service = MemoryCacheAdapter.create(options);
                break;
        }
        if (clearCache) {
            await service.delete();
        }
        return service;
    }
}

class RedisCacheAdapter implements CacheAdapterInterface {
    private static client: RedisClientType;

    private constructor(private options: CacheItem) {}
    private static async loadClientIfNecessary() {
        if (!RedisCacheAdapter.client) {
            const redisHost = Environment.settings.use_localhost_redis ? '127.0.0.1' : Environment.apiKeys.redis_host;
            RedisCacheAdapter.client = createClient({
                url: `redis://:@${redisHost}:6379`,
            });
            RedisCacheAdapter.client.on('error', (err: Error) => console.log('Redis Client Error', err));
            await RedisCacheAdapter.client.connect();
        }
    }

    static async create(options: CacheItem) {
        await RedisCacheAdapter.loadClientIfNecessary();
        return new RedisCacheAdapter(options);
    }

    static async clear(key: CachingKeys) {
        await RedisCacheAdapter.loadClientIfNecessary();

        const keysToDelete = await RedisCacheAdapter.client.keys(`api.${key}*`);
        if (keysToDelete.length > 0) {
            await RedisCacheAdapter.client.del(keysToDelete);
        }
    }

    set(value: NonNullable<unknown>) {
        const setOptions = this.options.ttl ? { EX: this.options.ttl } : {};
        return RedisCacheAdapter.client.set(this.options.fullKey, JSON.stringify(value), setOptions);
    }

    async get<T>() {
        const value = await RedisCacheAdapter.client.get(this.options.fullKey);
        return value ? (JSON.parse(value) as T) : undefined;
    }

    delete() {
        return RedisCacheAdapter.client.del(this.options.fullKey);
    }
}

class MemoryCacheAdapter implements CacheAdapterInterface {
    static cacheMap = new Map();

    constructor(private options: CacheItem) {}

    static create(options: CacheItem) {
        return new MemoryCacheAdapter(options);
    }

    set(value: unknown) {
        // TODO: implement ttl
        return Promise.resolve(MemoryCacheAdapter.cacheMap.set(this.options.fullKey, value));
    }

    get<T>() {
        return Promise.resolve(MemoryCacheAdapter.cacheMap.get(this.options.fullKey) as T);
    }

    delete() {
        return Promise.resolve(MemoryCacheAdapter.cacheMap.delete(this.options.fullKey));
    }
}
