import { SitlyRouter } from '../sitly-router';
import { NextFunction, Request, Response } from 'express';
import { BaseRoute } from './../route';
import { Serializer as JSONAPISerializer } from 'jsonapi-serializer';
import { Util } from '../../utils/util';
import { ParsedQs } from 'qs';
import { UrlUtil } from '../../utils/url-util';
import { PlaceResponse } from '../../models/serialize/place-response';
import { getModels } from '../../sequelize-connections';
import { FetchPageInfo } from '../fetch-page-info';
import { WebRoleId } from '../../models/user/user.model';

const serializer = new JSONAPISerializer('ratings', {
    attributes: ['rating', 'message', 'user', 'place', 'date'],
    keyForAttribute: 'camelCase',
    user: {
        ref: 'id',
        attributes: ['firstName', 'role'],
    },

    place: {
        ref: 'id',
        attributes: PlaceResponse.keys,
    },
});

export class CmsRatingsRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.get('/cms/ratings', (req, res, next) => {
            return new CmsRatingsRoute().index(req, res, next);
        });
    }

    private themes = {
        'all': {},
        'home': {
            webrole_id: WebRoleId.parent,
        },
        'babysit': {
            webrole_id: WebRoleId.parent,
            pref_babysitter: 1,
        },
        'childminder': {
            webrole_id: WebRoleId.parent,
            pref_babysitter: 0,
            pref_childminder: 1,
        },
        'babysit-jobs': {
            webrole_id: WebRoleId.babysitter,
        },
        'childminder-jobs': {
            webrole_id: WebRoleId.childminder,
        },
    } as const;

    async index(req: Request, res: Response, next: NextFunction) {
        const pageSize = { min: 1, max: 60 };
        const placeLength = { min: 1 };

        const pageSizeCheck = req.checkQuery('page.size');

        const pageNumberCheck = req.checkQuery('page.number');

        if (req.query['meta-only'] === '1') {
            pageSizeCheck.optional();
            pageNumberCheck.optional();
        }

        pageSizeCheck.isInt(pageSize).withMessage({
            code: 'INVALID_PAGE_SIZE',
            title: `page size must be a number between ${pageSize.min} and ${pageSize.max}`,
        });
        pageNumberCheck.isInt().withMessage({
            code: 'INVALID_PAGE_NUMBER',
            title: 'Page number must be a number',
        });
        req.checkQuery('filter.place')
            .optional()
            .isLength(placeLength)
            .withMessage({
                code: 'NOT_ENOUGH_CHARACTERS',
                title: `Place must be at least ${placeLength.min} character(s) long`,
            });
        req.checkQuery('meta-only').optional().custom(Util.isBooly).withMessage({
            code: 'INVALID_VALUE',
            title: 'meta-only must be 0 or 1',
        });
        req.checkQuery('type')
            .isIn(Object.keys(this.themes))
            .withMessage({
                code: 'INVALID_TYPE',
                title: `type must be one of ${Object.keys(this.themes).toString()}`,
            });
        req.sanitizeQuery('meta-only').toBoolean();
        req.sanitizeQuery('page.size').toInt();
        req.sanitizeQuery('page.number').toInt();
        if (await this.handleValidationResult(req, res)) {
            return;
        }

        try {
            const type = req.query.type as keyof typeof this.themes;
            const fetchPageInfo = FetchPageInfo.instance(req.query.page as never) ?? new FetchPageInfo(5, 1);

            const ratings = await getModels(req.brandCode).Rating.find(
                fetchPageInfo,
                this.themes[type],
                (req.query.filter as ParsedQs)?.place as string,
            );
            serializer.opts.meta = fetchPageInfo.responseMeta(ratings.count);
            const paginationInfo = fetchPageInfo?.paginationInfo(ratings.count);
            serializer.opts.topLevelLinks = UrlUtil.createPaginationUrls(req, paginationInfo.page, paginationInfo.pageCount);

            const models = ratings.rows.map(model => {
                return {
                    rating: model.rating,
                    message: model.message,
                    user: {
                        id: model.transactionMessage?.sender?.customUser.webuser_url,
                        firstName: model.transactionMessage?.sender?.first_name,
                        role: model.transactionMessage?.sender?.roleName,
                    },
                    place: {
                        id: model.transactionMessage?.sender?.customUser.place?.place_url,
                        name: model.transactionMessage?.sender?.customUser.place?.place_name,
                    },
                    date: model.delivered?.toISOString(),
                };
            });

            let query = `
                SELECT
                    MAX(rating) AS \`max\`,
                    MIN(rating) AS \`min\`,
                    AVG(rating) AS \`avg\`,
                    COUNT(rating) AS \`count\`
                FROM
                    custom_module_ratings r
                    INNER JOIN custom_module_messages m ON r.transaction_id = m.instance_id
                    INNER JOIN cms_webusers w ON m.sender_id = w.webuser_id
                    INNER JOIN custom_cms_webusers cw ON w.webuser_id = cw.webuser_id
                    INNER JOIN custom_module_places p ON cw.place_id = p.instance_id
            `;
            const where: Record<string, string | number> = { ...this.themes[type] };
            const place = (req.query.filter as ParsedQs)?.place;
            if (place) {
                where['p.place_url'] = `'${place as string}'`;
            }
            if (where) {
                let whereAnd = 'WHERE';

                for (const column of Object.keys(where)) {
                    query += ` ${whereAnd} ${column} = ${where[column]}`;
                    whereAnd = 'AND';
                }
            }

            serializer.opts.meta.ratings = await getModels(req.brandCode).Rating.sequelize.query(query, { plain: true });
            let response = serializer.serialize(models);
            if (req.query['meta-only']) {
                response = { meta: response.meta };
            }
            res.json(response);
        } catch (error) {
            console.log('wats met deze');
            console.trace(error);
        }
    }
}
