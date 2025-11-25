import { Request } from 'express';
import { ParsedQs, stringify } from 'qs';

export class UrlUtil {
    static apiUrl(req: Request, endpoint = '') {
        return `${req.get('host')?.indexOf('localhost') === 0 ? req.protocol : 'https'}://${req.get('host')}${req.baseUrl}${endpoint}`;
    }

    static createPaginationUrls(req: Request, currentPage: number, lastPage: number, customParams = {}) {
        const page = (req.query.page as ParsedQs) ?? {};
        const queryParams = { ...req.query, ...customParams };
        const firstPage = 1;

        const links: Record<string, string> = {
            self: this.createUrl(req, queryParams),
            first: this.createUrl(req, {
                ...queryParams,
                page: {
                    ...page,
                    number: firstPage,
                },
            }),
            last: this.createUrl(req, {
                ...queryParams,
                page: {
                    ...page,
                    number: lastPage,
                },
            }),
        };

        const previousPageNumber = currentPage > 1 ? currentPage - 1 : false;
        if (previousPageNumber) {
            links.prev = this.createUrl(req, {
                ...queryParams,
                page: {
                    ...page,
                    number: previousPageNumber,
                },
            });
        }

        const nextPageNumber = currentPage < lastPage ? currentPage + 1 : false;
        if (nextPageNumber) {
            links.next = this.createUrl(req, {
                ...queryParams,
                page: {
                    ...page,
                    number: nextPageNumber,
                },
            });
        }
        return links;
    }

    static createUrl(req: Request, params: unknown) {
        return `${req.path}?${stringify(params, { encode: false })}`;
    }
}
