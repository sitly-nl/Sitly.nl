import { BaseRoute } from './route';
import { Request, Response } from 'express';
import { SitlyRouter } from './sitly-router';
import { Environment } from '../services/env-settings.service';
import { config } from '../../config/config';
import { Error as JSONAPIError } from 'jsonapi-serializer';
import { ParsedQs } from 'qs';
import { LinksService } from '../services/links.service';

export class RedirectionsRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.get('/redirections', (req, res) => {
            return new RedirectionsRoute().renderRedirectionPage(req, res);
        });
    }

    private async renderRedirectionPage(req: Request, res: Response) {
        res.set('Content-Type', 'text/html');

        const brandConfigSettings = config.getConfig(req.brandCode);
        const websiteUrl = LinksService.websiteUrl(req.brandCode);
        const allowedDomains = [
            ...Object.values(brandConfigSettings.socialPages),
            brandConfigSettings.appstoreUrl,
            'https://play.google.com',
            websiteUrl,
            brandConfigSettings.url.replace('https://www', Environment.isProd ? 'https://app' : 'https://acceptance.app'), // old country specific domains
            LinksService.webAppBaseUrl,
        ].map(url => new URL(url).hostname);

        const allowedParams = ['element_category', 'element_description', 'element_type', 'action_name'];

        req.checkQuery('userUrl').notEmpty().withMessage({
            code: 'REQUIRED',
            title: 'userUrl is required',
        });

        req.checkQuery('redirectUrl')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'redirectUrl is required',
            })
            .custom((value?: string) => {
                try {
                    return value && allowedDomains.includes(new URL(value).hostname);
                } catch {
                    return false;
                }
            })
            .withMessage({
                code: 'INVALID_VALUE',
                title: 'redirectUrl is not allowed',
            });

        req.checkQuery('param')
            .custom((paramValue: ParsedQs) => {
                const suppliedParamKeys = Object.keys(paramValue ?? {});
                return suppliedParamKeys.every(paramKey => allowedParams.includes(paramKey));
            })
            .withMessage({
                code: 'INVALID_VALUE',
                title: `params must be in ${allowedParams}`,
            });

        const validationResult = await req.getValidationResult();
        const errors = validationResult.array();
        if (errors.length) {
            res.status(302);
            res.header('Location', websiteUrl);
            const serializedErrors = JSONAPIError(errors.map(BaseRoute.errorMapper));
            return res.json(serializedErrors);
        }

        const gtmConfig = {
            auth: Environment.apiKeys.google_tag_manager_auth,
            env: Environment.apiKeys.google_tag_manager_env,
            id: 'GTM-TBK6NVM',
        };
        const eventName = 'click';
        const platform = 'email';
        const title = 'Sitly redirection page';
        const redirectionBaseUrl = req.query.redirectUrl as string;
        const url = new URL(redirectionBaseUrl);
        url.searchParams.append('redirection-tracking-success', '1');
        const trackingSuccessUrl = url.toString();
        url.searchParams.set('redirection-tracking-success', '0');
        const trackingFailureUrl = url.toString();
        const gtmParams = req.query.param as ParsedQs | undefined;

        try {
            const html = `
<!DOCTYPE html>
<html>
    <head>
    <title>${title}</title>
    <meta http-equiv="refresh" content="3; url=${trackingFailureUrl}">
    <script>
        window.dataLayer = window.dataLayer ?? [];
        window.dataLayer.push({'sitly_platform': '${platform}'});
        window.dataLayer.push({'sitlyEnvironment': '${Environment.environmentName}'});
        ${
            gtmParams
                ? Object.keys(gtmParams)
                      .map(key => `window.dataLayer.push({'${key}': '${gtmParams[key] as never}'})`)
                      .join(';\n')
                : ''
        }
        window.dataLayer.push({
            event: '${eventName}',
            eventCallback: function(tagId) {
                if (tagId.indexOf('GTM-') !== 0) {
                    setTimeout(() => {
                        window.location.href = '${trackingSuccessUrl}';
                    }, 200);
                }
            },
            user_id: '${req.brandCode}.${req.query.userUrl as string}',
            eventTimeout: 2500
        });
    </script>

    <script>
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl+ '&gtm_auth=${gtmConfig.auth}&gtm_preview=${gtmConfig.env}&gtm_cookies_win=x';
        f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${gtmConfig.id}');
    </script>
    
    <style>
        * {
            box-sizing: border-box;
        }
        html,
        body,
        app {
            height: 100%;
        }

        body {
            background-color: #e8f1f9;
        }

        @keyframes rotation {
            0% {
                -webkit-transform: rotate(0deg);
                transform: rotate(0deg);
            }

            100% {
                -webkit-transform: rotate(360deg);
                transform: rotate(360deg);
            }
        }

        .loader {
            margin: 60px auto;
            width: 10em;
            height: 10em;
            text-indent: -9999em;
            border: 1.1em solid #b9439b;
            border-bottom-color: transparent;
            border-radius: 50%;
            box-sizing: border-box;
            animation: rotation 1s linear infinite;
        }
    </style>
    </head>

    <body>
    <div class="loader">Loading...</div>
    <script>
    setTimeout(() => {
        window.location.href = '${trackingFailureUrl}';
    }, 3000);
    </script>
    </body>
</html>`;
            res.send(html);
        } catch (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
        }
    }
}
