import { SitlyRouter } from './sitly-router';
import { Response } from 'express';
import { BaseRoute } from './route';
import { Serializer as JSONAPISerializer } from 'jsonapi-serializer';
import { UserRequest } from '../services/auth.service';

const serializer = new JSONAPISerializer('scripts', {
    attributes: ['source'],
    keyForAttribute: 'camelCase',
});

export class ScriptsRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.get<UserRequest>('/scripts', (req, res) => {
            return new ScriptsRoute().index(req, res);
        });
    }

    async index(req: UserRequest, res: Response) {
        const scripts = [];
        const notes = req.user.customUser?.notes ?? '';
        if (notes.indexOf('[reactivation]') > -1) {
            const isPremium = req.user.isPremium ? 'true' : 'false';
            const script = `
                fbq('trackCustom', 'BackendVisitReactivated', {
                    user_type: '${req.user.roleName}',
                    premium: '${isPremium}',
                    country: '${req.brandCode}'
                });

                ga('send', 'event', 'reactivation', '30 days', '${req.user.roleName}');
            `;

            await req.user.customUser.update({
                notes: notes.replace('[reactivation]', ''),
            });
            scripts.push({
                id: 'reactivation',
                source: script,
            });
        }

        res.json(serializer.serialize(scripts));
    }
}
