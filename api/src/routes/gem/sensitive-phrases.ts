import { SitlyRouter } from '../sitly-router';
import { Request, Response } from 'express';
import { BaseRoute } from '../route';
import { getSensitivePhraseSanitizationResults, SensitivePhraseRouteAction } from './sensitive-phrase-sanitization';
import { Error as JSONAPIError } from 'jsonapi-serializer';
import { notFoundError, unprocessableEntityError } from '../../services/errors';
import { getModels } from '../../sequelize-connections';
import { serializeSensitivePhrase, serializeSensitivePhraseSearch } from '../../models/serialize/sensitive-phrase-response';
import { UserWarningLevel } from '../../types';
import { FetchPageInfo } from '../fetch-page-info';

export class GemSensitivePhrasesRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.get('/gem/sensitive-phrases', (req, res) => {
            return new GemSensitivePhrasesRoute().list(req, res);
        });

        router.post('/gem/sensitive-phrases', (req, res) => {
            const { action } = req.body as Record<string, never>;
            switch (action) {
                case SensitivePhraseRouteAction.create:
                    return new GemSensitivePhrasesRoute().create(req, res);
                case SensitivePhraseRouteAction.delete:
                    return new GemSensitivePhrasesRoute().delete(req, res);
                default:
                    unprocessableEntityError({ res, title: `action not supported: ${action}` });
                    return null;
            }
        });

        router.patch('/gem/sensitive-phrases/:id', (req, res) => {
            return new GemSensitivePhrasesRoute().update(req, res);
        });
    }

    async list(req: Request, res: Response) {
        const errors = await getSensitivePhraseSanitizationResults(SensitivePhraseRouteAction.search, req, BaseRoute.errorMapper);
        if (errors.length) {
            res.status(422);
            res.json(JSONAPIError(errors));
            return void 0;
        }
        const searchParams = JSON.parse(JSON.stringify(req.query)) as Record<string, unknown>;

        const pageParam = searchParams.page as { size: string; number: string } | undefined;
        const page = FetchPageInfo.instance({ size: pageParam?.size ?? '10', number: pageParam?.number ?? '1' });
        const phrases = await getModels(req.brandCode).SensitivePhrase.find({
            ...searchParams,
            page,
        });

        res.json(serializeSensitivePhraseSearch(phrases.rows, page?.paginationInfo(phrases.count)));
    }

    async create(req: Request, res: Response) {
        const payload = (req.body.payload || {}) as object;
        if (Object.keys(payload).length === 0) {
            return unprocessableEntityError({ res, title: 'Request must contain a payload' });
        }
        req.body = { ...payload };
        const errors = await getSensitivePhraseSanitizationResults(SensitivePhraseRouteAction.create, req, BaseRoute.errorMapper);
        if (errors.length) {
            return res.status(422).json(JSONAPIError(errors));
        }

        const { phrase, type } = req.body as Record<string, unknown>;
        const createdPhrase = await getModels(req.brandCode).SensitivePhrase.create({
            phrase: phrase as string,
            type: type as UserWarningLevel,
        });

        res.status(201).json(serializeSensitivePhrase(createdPhrase));
    }

    async update(req: Request, res: Response) {
        const { id } = req.params;

        const sensitivePhrase = await getModels(req.brandCode).SensitivePhrase.findByPk(parseInt(id, 10));
        if (!sensitivePhrase) {
            return notFoundError({ res, title: 'Sensitive phrase not found' });
        }

        if (Object.keys(req.body as object).length === 0) {
            return unprocessableEntityError({ res, title: 'Request must contain parameters' });
        }

        const errors = await getSensitivePhraseSanitizationResults(SensitivePhraseRouteAction.update, req, BaseRoute.errorMapper);
        if (errors.length) {
            return res.status(422).json(JSONAPIError(errors));
        }

        await sensitivePhrase.update(JSON.parse(JSON.stringify(req.body)) as never);

        res.status(200).json(serializeSensitivePhrase(sensitivePhrase));
    }

    async delete(req: Request, res: Response) {
        if (!req.body.payload) {
            unprocessableEntityError({ res, title: 'Request must contain a payload' });
            return void 0;
        }
        req.body = { ...req.body.payload } as unknown;
        const errors = await getSensitivePhraseSanitizationResults(SensitivePhraseRouteAction.delete, req, BaseRoute.errorMapper);
        if (errors.length) {
            res.status(422);
            res.json(JSONAPIError(errors));
            return void 0;
        }
        const ids = req.body.ids as number[];
        const sensitivePhrases = await getModels(req.brandCode).SensitivePhrase.byIds(ids);
        const sensitivePhraseIds = sensitivePhrases.map(sensitivePhrase => sensitivePhrase.instance_id);
        for (const id of ids) {
            if (!sensitivePhraseIds.includes(id)) {
                return notFoundError({ res, title: `Sensitive phrase id not found ${id}` });
            }
        }

        await Promise.all(sensitivePhrases.map(sensitivePhrase => sensitivePhrase.destroy()));

        res.status(204);
        res.json('');
    }
}
