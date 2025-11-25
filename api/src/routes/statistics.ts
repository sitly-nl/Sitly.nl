import { SitlyRouter } from './sitly-router';
import { NextFunction, Request, Response } from 'express';
import { BaseRoute } from './route';
import { Serializer as JSONAPISerializer } from 'jsonapi-serializer';
import { UserSearchElastic } from '../search/user-search-elastic';
import { WebRoleId } from '../models/user/user.model';

export interface CountryStatisticsAttributes {
    parents: number;
    babysitters: number;
    childminders: number;
    babysitterJobs: number;
    childminderJobs: number;
}

export interface NestedAggsResults {
    'key': WebRoleId;
    'doc_count': number;
    'babysitter-jobs': {
        buckets: NestedAggsResults[];
    };
    'childminder-jobs': {
        buckets: NestedAggsResults[];
    };
}

const countryStatisticsCache: {
    [url: string]: {
        cacheTime: number;
        response: unknown;
    };
} = {};

const countryStatisticsSerializer = new JSONAPISerializer('statistics-country', {
    attributes: ['parents', 'babysitters', 'childminders', 'babysitterJobs', 'childminderJobs'],
    keyForAttribute: 'camelCase',
});
export class StatisticsRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.get('/statistics/users/country', (req, res, next) => {
            return new StatisticsRoute().countryStatistics(req, res, next);
        });
    }

    async countryStatistics(req: Request, res: Response, next: NextFunction) {
        const cached = countryStatisticsCache[req.originalUrl];
        const expiryTime = 3 * 60 * 60 * 1000; // 3 hours
        if (cached) {
            if (cached.cacheTime > new Date().getTime() - expiryTime) {
                return res.json(cached.response);
            }
        }

        const userSearch = new UserSearchElastic(req.brandCode, req.localeId);
        try {
            const totals = await userSearch.getTotals();
            const parsedTotals = this.elasticStatisticToObject(totals ?? []);
            const response = countryStatisticsSerializer.serialize(parsedTotals);

            countryStatisticsCache[req.originalUrl] = {
                cacheTime: new Date().getTime(),
                response,
            };

            res.status(200).json(response);
        } catch (error) {
            this.serverError(req, res, error as Error);
            console.trace(error);
        }
    }

    private elasticStatisticToObject(statistics: NestedAggsResults[]) {
        return statistics.reduce(
            (prev, next) => {
                switch (next.key) {
                    case WebRoleId.parent:
                        return {
                            ...prev,
                            parents: next.doc_count,
                            babysitterJobs: next['babysitter-jobs'].buckets.find(bucket => bucket.key === WebRoleId.parent)?.doc_count,
                            childminderJobs: next['childminder-jobs'].buckets.find(bucket => bucket.key === WebRoleId.parent)?.doc_count,
                        };
                    case WebRoleId.babysitter:
                        return {
                            ...prev,
                            babysitters: next.doc_count,
                        };
                    case WebRoleId.childminder:
                        return {
                            ...prev,
                            childminders: next.doc_count,
                        };
                }
            },
            {} as
                | {
                      parents?: number;
                      babysitterJobs?: number;
                      childminderJobs?: number;
                      babysitters?: number;
                      childminders?: number;
                  }
                | undefined,
        );
    }
}
