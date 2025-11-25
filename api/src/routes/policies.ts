import { Request, Response } from 'express';
import { BaseRoute } from './route';
import { SitlyRouter } from './sitly-router';
import { TranslationsService } from '../services/translations.service';

export class PoliciesRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.get('/policies/terms', (req, res) => {
            return new PoliciesRoute().policiesHtmlByType(req, res, 'terms');
        });

        router.get('/policies/cookie', (req, res) => {
            return new PoliciesRoute().policiesHtmlByType(req, res, 'cookie');
        });

        router.get('/policies/privacy', (req, res) => {
            return new PoliciesRoute().policiesHtmlByType(req, res, 'privacy');
        });
    }

    async policiesHtmlByType(req: Request, res: Response, policy: 'cookie' | 'privacy' | 'terms') {
        let headerKey;
        let contentKey;
        switch (policy) {
            case 'cookie':
                headerKey = 'terms.cookiePolicy.header';
                contentKey = 'terms.cookiePolicy.content';
                break;
            case 'privacy':
                headerKey = 'terms.privacyPolicy.header';
                contentKey = 'terms.privacyPolicy.content';
                break;
            case 'terms':
                headerKey = 'terms.termsOfService.header';
                contentKey = 'terms.termsOfService.content';
                break;
            default:
                policy satisfies never;
        }

        if (headerKey && contentKey) {
            await this.policiesHtml(req, res, headerKey, contentKey);
        } else {
            this.serverError(req, res);
        }
    }

    async policiesHtml(req: Request, res: Response, headerKey: string, contentKey: string) {
        const localeId = req.localeId;

        const translator = await TranslationsService.translator({
            localeId,
            groupName: 'api',
            prefix: 'terms.',
        });

        const html = `<!DOCTYPE html>
            <html>
            <head>
            <meta name="robots" content="noindex">
            <style>
            body {
                font-family:Arial;
            }

            .terms {
                max-width:880px;
                margin:0 auto;
            }
            </style>
            <title>${translator.translated(headerKey)}</title>
            </head>
            <body>
            <div class="terms">
            <img src="https://cdn.sitly.com/dot-com/logo.svg">
            <h1>${translator.translated(headerKey)}</h1>
            ${translator.translated(contentKey)}
            </div>
            </body>
            </html>`;

        res.status(200).contentType('html').send(html);
    }
}
