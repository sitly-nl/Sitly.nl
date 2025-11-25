import { Request } from 'express';
import { UserRequest } from './auth.service';
import { Device, DeviceColumns } from '../models/device.model';
import { BrandCode } from '../models/brand-code';
import { getModels } from '../sequelize-connections';
import { CreationAttributes } from 'sequelize';

export class DeviceService {
    models = getModels(this.brandCode);

    constructor(private brandCode: BrandCode) {}

    sanitize(req: Request, namespace = '') {
        const namespacePath = namespace ? `${namespace}.` : '';
        req.sanitizeBody(`${namespacePath}deviceType`).trim();
        req.sanitizeBody(`${namespacePath}fcmToken`).trim();
        req.sanitizeBody(`${namespacePath}deviceToken`).trim();

        const deviceTypes = ['android', 'ios', 'web'];

        const deviceTypeValidator = req.checkBody(`${namespacePath}deviceType`);
        const fcmTokenValidator = req.checkBody(`${namespacePath}fcmToken`);
        const deviceTokenValidator = req.checkBody(`${namespacePath}deviceToken`);

        deviceTypeValidator
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'Device type is required',
            })
            .isIn(deviceTypes)
            .withMessage({
                code: 'INVALID_VALUE',
                title: 'Device type can only be either android or ios',
            });

        fcmTokenValidator.notEmpty().withMessage({
            code: 'REQUIRED',
            title: 'fcmToken is required',
        });

        const body = (namespace ? req.body?.[namespace] : req.body) as Record<string, unknown>;
        if (body?.deviceType === 'ios') {
            deviceTokenValidator.notEmpty().withMessage({
                code: 'REQUIRED',
                title: 'deviceToken is required',
            });
        } else {
            deviceTokenValidator.optional().isEmpty().withMessage({
                code: 'INVALID_VALUE',
                title: 'deviceToken is not allowed for an android device',
            });
        }

        return req;
    }

    sanitizeUpdate(req: UserRequest) {
        const fcmTokenValidator = req.checkBody('fcmToken');

        const fcmTokenLength = {
            min: 152,
            max: 152,
        };
        fcmTokenValidator
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'fcmToken is required',
            })
            .isLength(fcmTokenLength)
            .withMessage({
                code: 'INVALID_LENGTH',
                title: `fcmToken must be ${fcmTokenLength.min} characters long`,
            });

        return req;
    }

    async createOrUpdate(deviceData: CreationAttributes<Device>) {
        return this.models.Device.upsert(deviceData);
    }

    async delete(fcmToken: string, userId: number) {
        const device = await this.models.Device.byFcmToken(fcmToken);
        if (!device) {
            throw new ReferenceError('Device not found');
        }
        if (device.webuser_id !== userId) {
            throw new ReferenceError('Device does not belong to provided user');
        }

        await device.destroy();
        return Promise.resolve(void 0);
    }

    async update(fcmToken: string, userId: number, deviceData: Partial<DeviceColumns>) {
        const device = await this.models.Device.byFcmToken(fcmToken);
        if (!device) {
            throw new ReferenceError('Device not found');
        }

        if (device.webuser_id !== userId) {
            throw new ReferenceError('Device does not belong to provided user');
        }

        return device.update(deviceData);
    }
}
