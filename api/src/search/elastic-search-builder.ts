import { SearchParseError } from './search-parse-error';
import { ScoringOptions } from './relevance-sorting/relevance-scoring-options';
import { RequestParams } from '@elastic/elasticsearch';
import { ElasticUser } from '../services/elastic.service';
import { PagingOptions } from '../../definitions.base';

export interface ElasticSearchBuilderAggs {
    [key: string]: {
        terms: {
            field: string;
        };
        aggs?: ElasticSearchBuilderAggs;
    };
}

export interface ElasticQuery {
    bool?: {
        must?: object[];
        must_not?: object[];
        should?: object[];
        filter?: object[];
        minimum_should_match?: number;
    };
    function_score?: {
        query: unknown;
        functions: unknown;
        boost_mode?: string;
        score_mode?: string;
    };
}

export class ElasticQueryBody {
    query: ElasticQuery = {};
    sort?: unknown[];
    aggs?: ElasticSearchBuilderAggs;
    track_total_hits?: boolean;
}

export class ElasticSearchBuilder {
    private _body = new ElasticQueryBody();

    private _scoringOptions: ScoringOptions;
    private _limit = 20;
    private _offset = 0;

    constructor(
        private indexName: string,
        includeDisabled?: boolean,
    ) {
        this.where('active', 1);
        this.where('completed', 1);
        this.where('inappropriate', 0);
        this.where('invisible', 0);
        if (!includeDisabled) {
            this.where('disabled', 0);
        }
    }

    private pushToBoolMust(item: object) {
        if (!this._body.query.bool) {
            this._body.query.bool = {};
        }

        const array = this._body.query.bool.must ?? [];
        array.push(item);
        this._body.query.bool.must = array;
    }

    pushToBoolMustNot(item: object) {
        if (!this._body.query.bool) {
            this._body.query.bool = {};
        }

        const array = this._body.query.bool.must_not ?? [];
        array.push(item);
        this._body.query.bool.must_not = array;
    }

    setPage(page: PagingOptions) {
        page.size = page.size ?? this._limit;
        page.number = page.number ?? 1;
        this.limit(page.size);
        this.offset((page.number - 1) * page.size);
    }

    where(key: keyof ElasticUser | `${keyof ElasticUser}.keyword`, value: number | string) {
        if (value === undefined) {
            throw new SearchParseError(`${key} is undefined`);
        }

        this.pushToBoolMust({
            term: { [key]: value },
        });
    }

    whereNot(key: string, value: number) {
        if (value === undefined) {
            throw new SearchParseError(`${key} is undefined`);
        }

        this.pushToBoolMustNot({
            term: { [key]: value },
        });
    }

    whereIn(key: string, value: unknown[]) {
        this.pushToBoolMust({
            terms: { [key]: value },
        });
    }

    whereNotIn(key: string, value: unknown) {
        this.pushToBoolMustNot({
            terms: { [key]: value },
        });
    }

    match(key: string, value: unknown, operator: 'AND' | 'OR' = 'AND') {
        this.pushToBoolMust({
            match: {
                [key]: {
                    query: value,
                    operator,
                },
            },
        });
    }

    whereContains(key: string, value: string, comparison: 'must' | 'should' = 'must') {
        if (!this._body.query.bool) {
            this._body.query.bool = {};
        }

        if (!this._body.query.bool[comparison]) {
            this._body.query.bool[comparison] = [];
        }

        if (this._body.query.bool.should) {
            this._body.query.bool.minimum_should_match = 1;
        }

        this._body.query.bool[comparison]?.push({
            wildcard: { [key]: `*${value}*` },
        });
    }

    filter(key: string, value: unknown) {
        if (!this._body.query.bool) {
            this._body.query.bool = {};
        }
        if (!this._body.query.bool.filter) {
            this._body.query.bool.filter = [];
        }
        this._body.query.bool.filter.push({ [key]: value });
    }

    range(key: keyof ElasticUser, value: Record<string, string | number>, type: 'include' | 'exclude' = 'include') {
        if (!this._body.query.bool) {
            this._body.query.bool = {};
        }

        const boolType = type === 'exclude' ? 'must_not' : 'must';

        if (!this._body.query.bool[boolType]) {
            this._body.query.bool[boolType] = [];
        }

        const range = { [key]: value };

        const existingRange = (this._body.query.bool[boolType] as { range: Record<string, Record<string, string | number>> }[])?.find(
            filter => filter.range?.[key],
        );
        if (existingRange) {
            existingRange.range[key] = Object.assign(existingRange.range[key] ?? {}, range[key]);
        } else {
            this._body.query.bool[boolType]?.push({ range });
        }
    }

    setScoringOptions(scoringOptions: ScoringOptions) {
        this._scoringOptions = scoringOptions;
    }

    custom(customElasticOptions: ElasticQuery) {
        this._body.query = customElasticOptions;
    }

    limit(limit: number) {
        this._limit = limit;
    }

    offset(offset: number) {
        this._offset = offset;
    }

    sort(field: string, options: string | object = 'asc') {
        if (!this._body.sort) {
            this._body.sort = [];
        }

        const sortField: Record<string, unknown> = {};
        if (typeof options === 'string') {
            sortField[field] = options.toLowerCase(); // "asc|desc"
        } else {
            sortField[field] = options;
        }
        this._body.sort.push(sortField);
    }

    aggs(aggs: ElasticSearchBuilderAggs) {
        this._body.aggs = aggs;
    }

    trackTotalHits() {
        this._body.track_total_hits = true;
    }

    toJSON(): RequestParams.Search<ElasticQueryBody> {
        if (this._scoringOptions) {
            const mustFilters = this._body.query.bool?.must;

            const lastLoginFilter = mustFilters?.find(filter => (filter as { range: { last_login: unknown } }).range?.last_login) ?? false;
            if (!lastLoginFilter) {
                this.range('last_login', {
                    gte: 'now-130d',
                });
            }
            this._body.query = this._scoringOptions.toJSON(this._body.query);
        }

        return {
            index: this.indexName,
            body: this._body,
            size: this._limit,
            from: this._offset,
        };
    }
}
