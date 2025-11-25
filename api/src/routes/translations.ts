import { Request, Response } from 'express';
import { BaseRoute } from './route';
import { SitlyRouter } from './sitly-router';
import { getMainModels } from '../sequelize-connections';
import { notFoundError } from '../services/errors';
import { serializeForWebApp } from '../models/serialize/translation-response';
import { TranslationsGroupName, TranslationsService } from '../services/translations.service';
import { Environment } from '../services/env-settings.service';

export class TranslationsRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.get('/translations/:translationGroup', (req, res) => {
            return new TranslationsRoute().index(req, res);
        });
    }

    async index(req: Request, res: Response) {
        const locale = await getMainModels().Locale.byLanguageCode(req.locale);
        if (!locale) {
            return notFoundError({ res, title: 'Locale not found' });
        }

        const translator = await TranslationsService.translator({
            localeId: locale.locale_id,
            groupName: req.params.translationGroup as TranslationsGroupName,
            testDb: Environment.isApiTests,
        });
        res.json(serializeForWebApp(translator.translations));
    }
}
