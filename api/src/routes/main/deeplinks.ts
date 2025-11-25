import { Request, Response } from 'express';
import { BaseRoute } from '../route';
import { SitlyRouter } from '../sitly-router';
import { LinksService } from '../../services/links.service';
import { Util } from '../../utils/util';
import { Constants } from '../../constants';

export class DeeplinksRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.get('/deeplinks', (req, res) => {
            return new DeeplinksRoute().index(req, res);
        });
        router.get('/apple-app-site-association', (_, res) => {
            new DeeplinksRoute().appleAppSiteAssociation(res);
            return null;
        });
    }

    async index(req: Request, res: Response) {
        // we need it only for ios at the moment
        const deviceTypes = ['ios'];
        req.checkQuery('deviceType')
            .optional()
            .withMessage({
                code: 'REQUIRED',
                title: 'Device type is required',
            })
            .isIn(deviceTypes)
            .withMessage({
                code: 'INVALID_VALUE',
                title: `Device type can only be one of ${deviceTypes.join(',')}`,
            });
        if (await this.handleValidationResult(req, res)) {
            return;
        }

        const deviceType = req.query.deviceType;

        const supportedLinks = this.supportedLinks();
        const links = Util.entries(supportedLinks).reduce(
            (acc, [key, value]) => {
                acc[key] = value.links;
                return acc;
            },
            {} as Record<keyof typeof supportedLinks, string[]>,
        );
        if (deviceType === 'ios') {
            Util.entries(links).forEach(([key, value]) => {
                links[key] = value.map(item =>
                    item
                        .replace(':userId', '[a-z0-9]+')
                        .replace(':tokenCode', '[a-zA-Z0-9]+')
                        .replace(':countryCode', '[a-z]{2}')
                        .replace(':placeId', '.*')
                        .replace(':token', 'ey.*')
                        .replace(':wildcard', '.*'),
                );
            });
        }
        res.json(links);
    }

    appleAppSiteAssociation(res: Response) {
        const supportedLinks = this.supportedLinks();
        const components = Object.values(supportedLinks).map(item => item.appleAssociationComponent);
        return res.json({
            applinks: {
                details: [
                    {
                        appIDs: [`${Constants.apple.teamId}.${Constants.apple.bundleId}`],
                        components,
                    },
                ],
            },
        });
    }

    private supportedLinks() {
        return {
            accountSettings: {
                links: [LinksService.accountSettingsUrl()],
                appleAssociationComponent: { '/': '/account' },
            },
            chat: {
                links: [LinksService.chatUrl(':wildcard')],
                appleAssociationComponent: { '/': '/messages/*' },
            },
            connectionInvites: {
                links: [LinksService.invitesUrl()],
                appleAssociationComponent: { '/': '/invites' },
            },
            password: {
                links: [LinksService.resetPasswordUrl(':countryCode' as never, ':token')],
                appleAssociationComponent: { '/': '/reset-password/*' },
            },
            profile: {
                links: [LinksService.profileUrl(':userId')],
                appleAssociationComponent: { '/': '/users/*' },
            },
            main: {
                links: [`${LinksService.webAppBaseUrl}/\\?tempToken=.*`],
                appleAssociationComponent: { '?': { tempToken: '*' } },
            },
        };
    }
}
