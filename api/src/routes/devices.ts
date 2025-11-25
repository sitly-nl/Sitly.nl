import { SitlyRouter } from './sitly-router';
import { Response } from 'express';
import { BaseRoute } from './route';
import { DeviceService } from '../services/device.service';
import { notFoundError } from '../services/errors';
import { UserRequest } from '../services/auth.service';

export class DevicesRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.post<UserRequest>('/users/me/devices', (req, res) => {
            return new DevicesRoute().create(req, res);
        });

        router.patch<UserRequest>('/users/me/devices/:fcmToken', (req, res) => {
            return new DevicesRoute().update(req, res);
        });

        router.delete<UserRequest>('/users/me/devices/:fcmToken', (req, res) => {
            return new DevicesRoute().delete(req, res);
        });
    }

    async create(req: UserRequest, res: Response) {
        try {
            const deviceService = new DeviceService(req.brandCode);

            deviceService.sanitize(req);

            if (await this.handleValidationResult(req, res)) {
                return void 0;
            }

            await deviceService.createOrUpdate({
                updated_at: new Date(),
                device_type: req.body.deviceType as never,
                fcm_token: req.body.fcmToken as string,
                device_token: req.body.deviceToken as string,
                webuser_id: req.user.webuser_id,
            });

            res.status(204);
            res.json('');
        } catch (e) {
            this.serverError(req, res, e as Error);
        }
    }

    async update(req: UserRequest, res: Response) {
        try {
            const deviceService = new DeviceService(req.brandCode);

            deviceService.sanitizeUpdate(req);

            if (await this.handleValidationResult(req, res)) {
                return void 0;
            }

            await deviceService.update(req.params.fcmToken, req.user.webuser_id, {
                updated_at: new Date(),
                fcm_token: req.body.fcmToken as string,
            });

            res.status(204);
            res.json();
        } catch (e) {
            this.serverError(req, res, e as Error);
        }
    }

    async delete(req: UserRequest, res: Response) {
        const deviceService = new DeviceService(req.brandCode);

        try {
            await deviceService.delete(req.params.fcmToken, req.user.webuser_id);
            res.status(204);
            res.json();
        } catch (e) {
            if (e instanceof ReferenceError) {
                notFoundError({ res, title: 'Device not found' });
            } else {
                this.serverError(req, res, e as Error);
            }
        }
    }
}
