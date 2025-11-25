import { SitlyRouter } from './sitly-router';
import { Response } from 'express';
import { BaseRoute } from './route';
import { Serializer as JSONAPISerializer, Error as JSONAPIError } from 'jsonapi-serializer';
import { forbiddenError, notFoundError } from '../services/errors';
import { ReferenceResponse } from '../models/serialize/reference-response';
import { UserRequest } from '../services/auth.service';
import { getModels } from '../sequelize-connections';

const serializer = new JSONAPISerializer('references', {
    attributes: ReferenceResponse.keys,
    keyForAttribute: 'camelCase',
    transform: ReferenceResponse.instance,
});

export class ReferencesRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.get<UserRequest>('/users/:userUrl/references', (req, res) => {
            return new ReferencesRoute().index(req, res);
        });
        router.post<UserRequest>('/users/me/references', (req, res) => {
            return new ReferencesRoute().create(req, res);
        });
        router.patch<UserRequest>('/users/me/references/:referenceId', (req, res) => {
            return new ReferencesRoute().update(req, res);
        });
        router.delete<UserRequest>('/users/me/references/:referenceId', (req, res) => {
            return new ReferencesRoute().delete(req, res);
        });
    }

    async index(req: UserRequest, res: Response) {
        let user;

        if (req.params.userUrl === 'me') {
            user = req.user;
        } else {
            user = await getModels(req.brandCode).User.byUserUrl(req.params.userUrl);
            if (!user) {
                res.status(404);
                const error = JSONAPIError({
                    code: 'NOT_FOUND',
                    title: 'User not found',
                });
                return res.json(error);
            }
        }

        await user.customUser.reload({ include: 'references' });
        res.status(200);
        res.json(serializer.serialize(user.customUser.references));
    }

    private sanitize(req: UserRequest) {
        req.sanitizeBody('familyName').trim();
        req.sanitizeBody('description').trim();

        const familyNameLength = {
            min: 3,
            max: 50,
        };

        const descriptionLength = {
            min: 40,
            max: 600,
        };

        const familyNameValidator = req.checkBody('familyName');
        const descriptionValidator = req.checkBody('description');
        if (req.method === 'PATCH') {
            [familyNameValidator, descriptionValidator].map(validator => validator.optional());
        }
        familyNameValidator
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'Family name is required',
            })
            .isLength(familyNameLength)
            .withMessage({
                code: 'INVALID_LENGTH',
                title: `Family name must be between ${familyNameLength.min} and ${familyNameLength.max} characters long`,
            });

        descriptionValidator
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'Description is required',
            })
            .isLength(descriptionLength)
            .withMessage({
                code: 'INVALID_LENGTH',
                title: `description must be between ${descriptionLength.min} and ${descriptionLength.max} characters long`,
            });

        return req;
    }

    async create(req: UserRequest, res: Response) {
        this.sanitize(req);
        if (await this.handleValidationResult(req, res)) {
            return;
        }
        const reference = await getModels(req.brandCode).Reference.create({
            last_name: req.body.familyName as string,
            description: req.body.description as string,
            webuser_id: req.user.webuser_id,
        });
        res.status(201);
        res.json(serializer.serialize(reference));
    }

    async update(req: UserRequest, res: Response) {
        this.sanitize(req);
        if (await this.handleValidationResult(req, res)) {
            return void 0;
        }

        let reference = await getModels(req.brandCode).Reference.byId(req.params.referenceId as never);
        if (!reference) {
            res.status(404);
            const error = JSONAPIError({
                code: 'NOT_FOUND',
                title: 'Child not found',
            });
            res.json(error);
            return void 0;
        }

        if (reference.webuser_id !== req.user.webuser_id) {
            return forbiddenError({ res, code: 'INVALID_AUTH', title: 'This is not yours to edit' });
        }

        if (req.body.familyName) {
            reference.last_name = req.body.familyName as string;
        }

        if (req.body.description) {
            reference.description = req.body.description as string;
        }
        try {
            reference = await reference.save();
        } catch (error) {
            return this.serverError(req, res, error as Error);
        }
        res.status(200);
        res.json(serializer.serialize(reference));
    }

    async delete(req: UserRequest, res: Response) {
        const reference = await getModels(req.brandCode).Reference.byId(req.params.referenceId);
        if (!reference) {
            return notFoundError({ res, title: 'Reference not found' });
        }
        if (reference.webuser_id !== req.user.webuser_id) {
            return forbiddenError({ res, code: 'INVALID_AUTH', title: 'This is not yours to delete' });
        }

        await reference.destroy();
        res.status(204);
        res.json('');
    }
}
