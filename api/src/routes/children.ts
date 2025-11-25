import { SitlyRouter } from './sitly-router';
import { Response } from 'express';
import { BaseRoute } from './route';
import { Serializer as JSONAPISerializer } from 'jsonapi-serializer';
import { ChildTraits, allChildTraits } from './../models/child.model';
import * as moment from 'moment';
import { forbiddenError, notFoundError } from '../services/errors';
import { ChildResponse } from '../models/serialize/child-response';
import { getModels } from '../sequelize-connections';
import { UserRequest } from '../services/auth.service';

const serializer = new JSONAPISerializer('children', {
    attributes: ChildResponse.privateKeys,
    keyForAttribute: 'camelCase',
    transform: ChildResponse.instance,
});

export class ChildrenRoute extends BaseRoute {
    static genderMap = {
        unknown: 'u',
        female: 'f',
        male: 'm',
    } as const;

    private birthdayValidation = (value: moment.MomentInput) => {
        const valueTime = moment(value, moment.ISO_8601).unix();
        const minTime = moment(moment().format('YYYY-MM-DD')).subtract(14, 'years').unix();
        return valueTime >= minTime;
    };

    static create(router: SitlyRouter) {
        router.get<UserRequest>('/users/me/children', (req, res) => {
            return new ChildrenRoute().index(req, res);
        });

        router.post<UserRequest>('/users/me/children', (req, res) => {
            return new ChildrenRoute().create(req, res);
        });

        router.patch<UserRequest>('/users/me/children/:childId', (req, res) => {
            return new ChildrenRoute().update(req, res);
        });

        router.delete<UserRequest>('/users/me/children/:childId', (req, res) => {
            return new ChildrenRoute().delete(req, res);
        });
    }

    async index(req: UserRequest, res: Response) {
        await req.user.customUser.reload({ include: 'children' });
        res.json(serializer.serialize(req.user.customUser.children));
    }

    async create(req: UserRequest, res: Response) {
        req.sanitizeBody('birthdate').trim();
        req.sanitizeBody('gender').trim();

        req.checkBody('birthdate')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'Birthdate is required',
            })
            .isISO8601()
            .withMessage({
                code: 'INVALID_FORMAT',
                title: 'Date must be in iso 8601 format',
            })
            .callback(this.birthdayValidation)
            .withMessage({
                code: 'INVALID_VALUE',
                title: 'Children must be below 14 years old',
            });

        req.checkBody('gender')
            .notEmpty()
            .withMessage({
                code: 'REQUIRED',
                title: 'Gender is required',
            })
            .isIn(['unknown', 'female', 'male'])
            .withMessage({
                code: 'INVALID_VALUE',
                title: 'Invalid gender, must be one of [unknown, female, male]',
            });

        this.sanitizeChild(req);
        if (await this.handleValidationResult(req, res)) {
            return;
        }

        const child = await getModels(req.brandCode).Child.create({
            birthdate: new Date(req.body.birthdate as string),
            gender: ChildrenRoute.genderMap[req.body.gender as 'unknown' | 'female' | 'male'],
            webuser_id: req.user.webuser_id,
            traits: req.body.traits?.length > 0 ? (req.body.traits as never) : null,
        });

        res.status(201);
        res.json(serializer.serialize(child));
    }

    async update(req: UserRequest, res: Response) {
        const child = await getModels(req.brandCode).Child.byId(+req.params.childId);
        if (!child) {
            return notFoundError({ res, title: 'Child not found' });
        }
        if (child.webuser_id !== req.user.webuser_id) {
            return forbiddenError({ res, code: 'INVALID_AUTH', title: 'This is not yours to edit' });
        }

        req.sanitizeBody('birthdate').trim();
        req.sanitizeBody('gender').trim();

        req.checkBody('birthdate')
            .optional()
            .isISO8601()
            .withMessage({
                code: 'INVALID_FORMAT',
                title: 'Date must be in iso 8601 format',
            })
            .callback(this.birthdayValidation)
            .withMessage({
                code: 'INVALID_VALUE',
                title: 'Children must be below 14 years old',
            });

        req.checkBody('gender').optional().isIn(['unknown', 'female', 'male']).withMessage({
            code: 'INVALID_VALUE',
            title: 'Invalid gender, must be one of [unknown, female, male]',
        });
        this.sanitizeChild(req);
        if (await this.handleValidationResult(req, res)) {
            return;
        }

        if (req.body.birthdate) {
            child.birthdate = new Date(req.body.birthdate as string);
        }
        const gender = ChildrenRoute.genderMap[req.body.gender as 'unknown' | 'female' | 'male'];
        if (gender) {
            child.gender = gender;
        }
        const traits = req.body.traits as ChildTraits[] | undefined;
        if (traits) {
            child.traits = traits.length > 0 ? traits : null;
        }
        await child.save();
        res.json(serializer.serialize(child));
    }

    private sanitizeChild(req: UserRequest) {
        const allowedTraits = [''].concat(allChildTraits);
        req.checkBody('traits')
            .optional()
            .isIn(allowedTraits)
            .withMessage({
                code: 'INVALID_VALUE',
                title: `traits must be in ${allChildTraits}`,
            })
            .callback((value: string) => {
                return value?.length <= 3;
            })
            .withMessage({
                code: 'INVALID_VALUE',
                title: 'you can choose up to 3 traits',
            });
    }

    async delete(req: UserRequest, res: Response) {
        await req.user.customUser.reload({ include: 'children' });
        if (req.user.customUser.children?.length === 1) {
            return forbiddenError({ res, code: 'INVALID_VALUE', title: 'It is prohibited to remove last child' });
        }

        const child = await getModels(req.brandCode).Child.byId(+req.params.childId);
        if (!child) {
            return notFoundError({ res, title: 'Child not found' });
        }

        if (child.webuser_id !== req.user.webuser_id) {
            return forbiddenError({ res, code: 'INVALID_AUTH', title: 'This is not yours to delete' });
        }

        await child.destroy();
        res.status(204).json();
    }
}
