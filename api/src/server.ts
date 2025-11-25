import { SentryService } from './services/sentry.service';
SentryService.init(); // must be called before express import
import { setupExpressErrorHandler } from '@sentry/node';
import { EmailEventsRoute } from './routes/email-events';
import { StatisticsRoute } from './routes/statistics';
import { PaymentNotificationsRoute } from './routes/payments/payment-notifications';
import { WelfareCompaniesRoute } from './routes/welfare/welfare';
import { JobPostingRoute } from './routes/job-posting';
import { ReportsRoute } from './routes/reports';
import { FeedbacksRoute } from './routes/feedbacks';
import { CountrySettingsRoute } from './routes/country-settings';
import { ConversationsRoute } from './routes/messages/conversations';
import { PhotosRoute } from './routes/photos';
import { ReferencesRoute } from './routes/references';
import { DevicesRoute } from './routes/devices';
import { AddressComponentsRoute } from './routes/address-components';
import * as bodyParser from 'body-parser';
import * as express from 'express';
import { Application, NextFunction, Request, Response } from 'express';
import * as logger from 'morgan';
import * as path from 'path';
import * as errorHandler from 'errorhandler';
import * as methodOverride from 'method-override';
import { IndexRoute } from './routes/index';
import { UsersRoute } from './routes/users/users';
import { TokensRoute } from './routes/tokens';
import { ChildrenRoute } from './routes/children';
import { FavoritesRoute } from './routes/favorites';
import { ExclusionsRoute } from './routes/user-exclusions';
import { CmsSettingsRoute } from './routes/cms/settings';
import { CmsPlacesRoute } from './routes/cms/places';
import { CmsRatingsRoute } from './routes/cms/ratings';
import { LocalesRoute } from './routes/locales';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import compression = require('compression');
// eslint-disable-next-line @typescript-eslint/no-require-imports
import validator = require('express-validator');
import { openSync } from 'fs';
import * as locale from 'locale';
import { PaymentsRoute } from './routes/payments/payments';
import { CmsDeeplinkUrlsRoute } from './routes/cms/deeplink-urls';
import { RecommendationsOldRoute } from './routes/recommendations-old';
import { ElasticSearchRoute } from './routes/elastic-search';
openSync('restart.txt', 'w'); // let tools know that the server has restarted
import * as cors from 'cors';
import { ScriptsRoute } from './routes/scripts';
import { MaintenanceRoute } from './routes/maintenance';
import { BrandCode } from './models/brand-code';
import { UsersCreateRoute } from './routes/users/users-create';
import { UsersUpdateRoute } from './routes/users/users-update';
import { UsersSearchRoute } from './routes/users/users-search';
import { UsersResetPasswordRoute } from './routes/users/users-reset-password';
import { AuthService } from './services/auth.service';
import { Files } from './services/files.service';
import { config } from '../config/config';
import { GemTokensRoute } from './routes/gem/gem-tokens';
import { GemUsersRoute } from './routes/gem/gem-users';
import { GemSitlyUsersRoute } from './routes/gem/sitly-users';
import { GemSitlyUserConversationsRoute } from './routes/gem/sitly-user-conversations';
import { GemSitlyUsersRecommendationsRoute } from './routes/gem/sitly-user-recommendations';
import { GemSitlyUserWarningsRoute } from './routes/gem/sitly-user-warnings';
import { GemSensitivePhrasesRoute } from './routes/gem/sensitive-phrases';
import { GemSitlyUserPersonalDataRoute } from './routes/gem/sitly-user-personal-data';
import { GemSensitivePhraseExclusionsRoute } from './routes/gem/sensitive-phrase-exclusions';
import { MessagesRoute } from './routes/messages/messages';
import { InstagramTokensRoute } from './routes/instagram-tokens';
import { HttpError, unauthorized } from './services/errors';
import { SitlyRouter } from './routes/sitly-router';
import { CacheRoute } from './routes/cache';
import { FeaturesRoute } from './routes/features';
import { getMainModels } from './sequelize-connections';
import { TranslationGroupsRoute } from './routes/gem/translations/translation-groups';
import { TranslationRoute } from './routes/gem/translations/translations';
import { TranslationsFetchRoute } from './routes/gem/translations/translations-fetch';
import { GemFeedbacksRoute } from './routes/gem/feedbacks';
import { GemSubscriptionsRoute } from './routes/gem/subscriptions/subscriptions';
import { TranslationsRoute } from './routes/translations';
import { RedirectionsRoute } from './routes/redirections';
import { CountriesRoute } from './routes/main/countries';
import { DeeplinksRoute } from './routes/main/deeplinks';
import { ConnectionInviteRoute } from './routes/connection-invites';
import { NotificationPreferencesRoute } from './routes/users/notification-preferences';
import { PoliciesRoute } from './routes/policies';
import { RecommendationsRoute } from './routes/recommendations';
import { PaymentsCreateRoute } from './routes/payments/payments-create';

export class Server {
    app: Application;

    constructor() {
        this.app = express();
        this.config().then(() => {
            this.addRoutes();
            setupExpressErrorHandler(this.app);
        });
    }

    static bootstrap() {
        return new Server();
    }

    async config() {
        this.app.use(Server.handleCheckRequest);

        this.app.use(compression());

        const supportedLocales = await getMainModels().Locale.supportedLocales();
        this.app.use((req, res, next) => {
            const brandCode = Server.getBrand(req);
            if (!brandCode) {
                res.status(404);
                res.send('Wrong brandCode provided');
            } else {
                req.brandCode = brandCode;
                let defaultLocaleCode = Files.config.default_locale;
                const brandConfigSettings = config.getConfig(req.brandCode);
                if (brandConfigSettings) {
                    defaultLocaleCode =
                        Object.keys(supportedLocales).find(key => supportedLocales[key] === brandConfigSettings.defaultLocaleId) ??
                        Files.config.default_locale;
                }

                return locale(new locale.Locales(Object.keys(supportedLocales), defaultLocaleCode))(req, res, next);
            }
        });
        this.app.use((req, _res, next) => {
            req.localeId = supportedLocales[req.locale];
            next();
        });

        this.app.use(cors());

        this.app.use(express.static(path.join(__dirname, 'public')));

        this.app.use(logger('dev'));

        // mount json form parser
        this.app.use(bodyParser.json({ limit: '50mb' }));

        // mount query string parser
        this.app.use(
            bodyParser.urlencoded({
                limit: '50mb',
                extended: true,
            }),
        );

        this.app.use((_req, res, next) => {
            res.header('Content-Type', 'application/vnd.api+json');
            next();
        });

        this.app.use(
            validator({
                customValidators: {
                    callback(...args: unknown[]) {
                        const value = args.shift();
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
                        const callback = args.shift() as Function;
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                        return callback.apply(this, [value, ...args]);
                    },
                },
            }),
        );

        // mount override?
        this.app.use(methodOverride());

        this.app.use((err: HttpError, _req: Request, _res: Response, next: NextFunction) => {
            err.status = 404; // catch 404 and forward to error handler
            next(err);
        });

        this.app.use((req, res, next) => {
            AuthService.handleAuth(req, res, next);
        });

        if (process.env.NODE_ENV === 'development') {
            this.app.use(errorHandler());
        } else {
            this.app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
                console.log(req.url, err);
                if (err.name === 'UnauthorizedError') {
                    unauthorized({ res });
                } else {
                    res.status(500).end('error');
                }
            });
        }
    }

    private static handleCheckRequest(req: Request, res: Response, next: NextFunction) {
        if (req.path === '/check' && req.method === 'GET') {
            res.status(200);
            res.header('Cache-control', 'no-cache');
            res.json();
        } else {
            next();
        }
    }

    private addRoutes() {
        const expressRouter = express.Router();
        this.app.use('/:version/:brandCode', expressRouter);

        expressRouter.all('*', (req: Request, _res: Response, next: NextFunction) => {
            const urlParts = req.originalUrl.split('/').filter(item => {
                return !!item;
            });
            const version = urlParts[0];
            req.apiVersion = version;
            next();
        });

        const router = new SitlyRouter(expressRouter);

        // User routes
        IndexRoute.create(router);
        UsersRoute.create(router);
        UsersCreateRoute.create(router);
        UsersUpdateRoute.create(router);
        UsersSearchRoute.create(router);
        UsersResetPasswordRoute.create(router);
        TokensRoute.create(router);
        ChildrenRoute.create(router);
        ReferencesRoute.create(router);
        DevicesRoute.create(router);
        ConversationsRoute.create(router);
        MessagesRoute.create(router);
        PhotosRoute.create(router);
        FavoritesRoute.create(router);
        ExclusionsRoute.create(router);
        LocalesRoute.create(router);
        AddressComponentsRoute.create(router);
        CountrySettingsRoute.create(router);
        FeedbacksRoute.create(router);
        ReportsRoute.create(router);
        PaymentsRoute.create(router);
        PaymentsCreateRoute.create(router);
        PaymentNotificationsRoute.create(router);
        RecommendationsOldRoute.create(router);
        ElasticSearchRoute.create(router);
        JobPostingRoute.create(router);
        ScriptsRoute.create(router);
        InstagramTokensRoute.create(router);
        ConnectionInviteRoute.create(router);
        NotificationPreferencesRoute.create(router);

        // CMS routes
        CmsSettingsRoute.create(router);
        CmsRatingsRoute.create(router);
        CmsPlacesRoute.create(router);
        CmsDeeplinkUrlsRoute.create(router);

        // Gem routes
        GemTokensRoute.create(router);
        GemUsersRoute.create(router);
        GemSitlyUserWarningsRoute.create(router);
        GemSitlyUserPersonalDataRoute.create(router);
        GemSitlyUsersRoute.create(router);
        GemSitlyUserConversationsRoute.create(router);
        GemSitlyUsersRecommendationsRoute.create(router);
        GemSensitivePhrasesRoute.create(router);
        GemSensitivePhraseExclusionsRoute.create(router);
        [TranslationGroupsRoute, TranslationRoute, TranslationsFetchRoute, GemFeedbacksRoute, GemSubscriptionsRoute].forEach(item =>
            item.create(router),
        );

        // Main routes
        [CountriesRoute, DeeplinksRoute, PoliciesRoute].forEach(item => item.create(router));

        [
            CacheRoute,
            FeaturesRoute,
            MaintenanceRoute,
            RecommendationsRoute,
            RedirectionsRoute,
            StatisticsRoute,
            TranslationsRoute,
            WelfareCompaniesRoute,
        ].forEach(item => item.create(router));

        // Plain/text content-type route
        EmailEventsRoute.create(expressRouter);

        console.log('[Routes::create] - finished');
    }

    private static getBrand(req: Request) {
        const brandCode = req.originalUrl.split('/').filter(item => {
            return !!item;
        })[1] as BrandCode;

        if (Object.values(BrandCode).includes(brandCode)) {
            return brandCode;
        }
    }
}
