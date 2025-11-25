import { SitlyRouter } from '../sitly-router';
import { Request, Response } from 'express';
import { BaseRoute } from '../route';
import {
    getSensitivePhraseExclusionSanitizationResults,
    SensitivePhraseExclusionsRouteAction,
} from './sensitive-phrase-exclusion-sanitization';
import { Error as JSONAPIError } from 'jsonapi-serializer';
import { notFoundError, unprocessableEntityError } from '../../services/errors';
import { getModels } from '../../sequelize-connections';
import { FetchPageInfo } from '../fetch-page-info';
import {
    serializeSensitivePhraseExclusion,
    serializeSensitivePhraseExclusionSearch,
} from '../../models/serialize/sensitive-phrase-exclusion-response';

export class GemSensitivePhraseExclusionsRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.get('/gem/sensitive-phrase-exclusions', (req, res) => {
            return new GemSensitivePhraseExclusionsRoute().list(req, res);
        });

        router.post('/gem/sensitive-phrase-exclusions', (req, res) => {
            const { action } = req.body as Record<string, never>;
            switch (action) {
                case SensitivePhraseExclusionsRouteAction.create:
                    return new GemSensitivePhraseExclusionsRoute().create(req, res);
                case SensitivePhraseExclusionsRouteAction.delete:
                    return new GemSensitivePhraseExclusionsRoute().delete(req, res);
                default:
                    unprocessableEntityError({ res, title: `action not supported: ${action}` });
                    return null;
            }
        });

        router.patch('/gem/sensitive-phrase-exclusions/:id', (req, res) => {
            return new GemSensitivePhraseExclusionsRoute().update(req, res);
        });
    }

    async list(req: Request, res: Response) {
        const errors = await getSensitivePhraseExclusionSanitizationResults(
            SensitivePhraseExclusionsRouteAction.search,
            req,
            BaseRoute.errorMapper,
        );
        if (errors.length) {
            res.status(422);
            res.json(JSONAPIError(errors));
            return void 0;
        }
        const searchParams = JSON.parse(JSON.stringify(req.query)) as Record<string, unknown>;

        const pageParam = searchParams.page as { size: string; number: string } | undefined;
        const page = FetchPageInfo.instance({ size: pageParam?.size ?? '10', number: pageParam?.number ?? '1' });
        const exclusions = await getModels(req.brandCode).SensitivePhraseExclusion.find({
            ...searchParams,
            page,
        });
        res.status(200).json(serializeSensitivePhraseExclusionSearch(exclusions.rows, page?.paginationInfo(exclusions.count)));
    }

    async create(req: Request, res: Response) {
        if (!req.body.payload) {
            unprocessableEntityError({ res, title: 'Request must contain a payload' });
            return void 0;
        }
        req.body = { ...req.body.payload } as unknown;
        const errors = await getSensitivePhraseExclusionSanitizationResults(
            SensitivePhraseExclusionsRouteAction.create,
            req,
            BaseRoute.errorMapper,
        );
        if (errors.length) {
            return res.status(422).json(JSONAPIError(errors));
        }

        const { phrase } = req.body as Record<string, unknown>;
        const createdPhrase = await getModels(req.brandCode).SensitivePhraseExclusion.create({
            phrase: phrase as string,
        });
        res.status(201).json(serializeSensitivePhraseExclusion(createdPhrase));
    }

    async update(req: Request, res: Response) {
        const { id } = req.params;

        const sensitivePhraseExclusion = await getModels(req.brandCode).SensitivePhraseExclusion.findByPk(parseInt(id, 10));
        if (!sensitivePhraseExclusion) {
            return notFoundError({ res, title: 'Sensitive phrase exclusion not found' });
        }

        if (Object.keys(req.body as object).length === 0) {
            return unprocessableEntityError({ res, title: 'Request must contain parameters' });
        }

        const errors = await getSensitivePhraseExclusionSanitizationResults(
            SensitivePhraseExclusionsRouteAction.update,
            req,
            BaseRoute.errorMapper,
        );
        if (errors.length) {
            return res.status(422).json(JSONAPIError(errors));
        }

        await sensitivePhraseExclusion.update(JSON.parse(JSON.stringify(req.body)) as never);

        res.status(200).json(serializeSensitivePhraseExclusion(sensitivePhraseExclusion));
    }

    async delete(req: Request, res: Response) {
        if (!req.body.payload) {
            unprocessableEntityError({ res, title: 'Request must contain a payload' });
            return void 0;
        }
        req.body = { ...req.body.payload } as unknown;
        const errors = await getSensitivePhraseExclusionSanitizationResults(
            SensitivePhraseExclusionsRouteAction.delete,
            req,
            BaseRoute.errorMapper,
        );
        if (errors.length) {
            return res.status(422).json(JSONAPIError(errors));
        }

        const ids = req.body.ids as number[];
        const exclusionCollection = await getModels(req.brandCode).SensitivePhraseExclusion.byIds(ids);
        const sensitivePhraseExclusionIds = exclusionCollection.map(exclusion => exclusion.instance_id);
        for (const id of ids) {
            if (!sensitivePhraseExclusionIds.includes(id)) {
                return notFoundError({ res, title: `Sensitive phrase exclusion id not found ${id}` });
            }
        }

        await Promise.all(exclusionCollection.map(exclusion => exclusion.destroy()));

        res.status(204).json();
    }
}
