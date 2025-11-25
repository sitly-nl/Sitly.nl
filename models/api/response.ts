export class BaseApiModel {
    id: string;
    meta: unknown = {};
    links: unknown = {};
}

export interface Relationship {
    type: string;
    id: string;
}

export interface ServerResponseData {
    type: string;
    id: string;
    attributes: { id: string; [selector: string]: unknown };
    meta?: unknown;
    links?: Record<string, string>;
    relationships?: Record<string, { data: Relationship | Relationship[] }>;
}

export interface ServerResponse {
    data: ServerResponseData | ServerResponseData[];
    included: ServerResponseData[];
    meta?: Record<string, unknown>;
    links?: unknown;
}

export interface PageMeta {
    totalCount?: number;
    totalPages?: number;
}

export interface ParsedResponse<T, M> {
    links?: Record<string, string>;
    meta?: M;
    data: T;
}
