import { Request, Response } from 'express';
import { serializeForGem } from '../../../models/serialize/translation-response';
import { getTranslationModels } from '../../../sequelize-connections';
import { validatePage } from '../../common-validators';
import { BaseRoute } from '../../route';
import { SitlyRouter } from '../../sitly-router';
import { validateSourceAndTarget } from './translation-validation';
import { TranslationEnvironment } from './translations';

export class TranslationsFetchRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.get('/gem/translations', (req, res) => {
            return new TranslationsFetchRoute().searchTranslations(req, res);
        });

        router.get('/gem/translations/diff', (req, res) => {
            return new TranslationsFetchRoute().searchTranslationsDiff(req, res);
        });
    }

    async searchTranslations(req: Request, res: Response) {
        let localeIds: number[] = [];
        const filter = req.query.filter as { keyword?: string; groupId?: string; countryId?: string; untranslated?: boolean } | undefined;
        const allowedFilterKeys = ['keyword', 'groupId', 'countryId', 'untranslated'];
        const page = validatePage({ req });
        req.checkQuery('localeIds')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'localeIds is required',
            })
            .custom((localeIdsString?: string) => {
                if (typeof localeIdsString !== 'string') {
                    return false;
                }
                localeIds = localeIdsString?.split(',').map(item => parseInt(item)) ?? [];
                return localeIds.length > 0 && localeIds.length <= 2 && localeIds.every(item => Number.isInteger(item));
            })
            .withMessage({
                code: 'INVALID_VALUE',
                title: 'localeIds should be not empty CSV with up to 2 values',
            });
        req.checkQuery('filter')
            .optional()
            .custom((filter: Record<string, unknown>) => {
                return allowedFilterKeys.some(key => filter[key]);
            })
            .withMessage({
                code: 'INVALID_VALUE',
                title: `filter should contain at least one of ${allowedFilterKeys} keys`,
            });
        if (await this.handleValidationResult(req, res)) {
            return;
        }

        const translations = await getTranslationModels().TranslationValue.find({
            localeIds,
            ...filter,
            page,
        });
        res.json(serializeForGem(translations.rows, page?.responseMeta(translations.count)));
    }

    async searchTranslationsDiff(req: Request, res: Response) {
        let localeIds: number[] | undefined;
        const filter = req.query.filter as { keyword?: string } | undefined;
        const source = req.query.source as TranslationEnvironment;
        const target = req.query.target as TranslationEnvironment;
        const allowedFilterKeys = ['keyword'];

        const page = validatePage({ req });
        validateSourceAndTarget(req);
        req.checkQuery('localeIds')
            .optional()
            .custom((localeIdsString?: string) => {
                if (typeof localeIdsString !== 'string') {
                    return false;
                }
                localeIds = localeIdsString?.split(',').map(item => parseInt(item));
                return localeIds.length > 0 && localeIds.every(item => Number.isInteger(item));
            })
            .withMessage({
                code: 'INVALID_VALUE',
                title: 'localeIds should be not empty CSV',
            });
        req.checkQuery('filter')
            .optional()
            .custom((filter: Record<string, unknown>) => {
                return allowedFilterKeys.some(key => filter[key]);
            })
            .withMessage({
                code: 'INVALID_VALUE',
                title: `filter should contain at least one of ${allowedFilterKeys} keys`,
            });
        if (await this.handleValidationResult(req, res)) {
            return;
        }

        const translations = await getTranslationModels().TranslationValue.findWithDifferentValues({
            source,
            target,
            localeIds,
            keyword: filter?.keyword,
            page,
        });
        res.json(serializeForGem(translations.rows, page?.responseMeta(translations.count)));
    }
}
