import { AvatarValidatorGoogleAutoML } from './../services/avatar-validation/avatar-validation-GoogleAutoML.service';
import { SitlyRouter } from './sitly-router';
import { NextFunction, Request, Response } from 'express';
import { BaseRoute } from './route';
import { readFileSync } from 'fs';

const imageBase64 = Buffer.from(readFileSync('./resources/images/autoMLwakeUp.jpeg')).toString('base64');
export class MaintenanceRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.post('/maintenance/wakeup-automl', (req, res, next) => {
            return new MaintenanceRoute().wakeUpAutoML(req, res, next);
        });
    }

    private async wakeUpAutoML(req: Request, res: Response, next: NextFunction) {
        const service = new AvatarValidatorGoogleAutoML();
        await service.validate(imageBase64);
        res.status(204);
        res.json();
    }
}
