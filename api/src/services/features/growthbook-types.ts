export enum GrowthbookEnvironment {
    development = 'development',
    acceptance = 'acceptance',
    production = 'production',
}

export enum GrowthbookProjectId {
    webApp = 'prj_19g61tlh7e7itn',
}

export const growthbookProjectIds = Object.values(GrowthbookProjectId);

export interface GrowthbookApiResponse {
    body: {
        features: GrowthbookRawFeature[];
        nextOffset: number | null;
        hasMore: boolean;
    };
}

export interface GrowthbookRawFeature {
    id: string;
    archived: boolean;
    project: string;
    environments: {
        [K in GrowthbookEnvironment]?: {
            defaultValue?: string;
            definition?: string;
            enabled: boolean;
            rules?: Record<string, unknown>[];
        };
    };
}
