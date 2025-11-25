import { WelfareCompanySerializer } from './welfare-company.serializer';
import { BaseRoute } from '../route';
import { SitlyRouter } from './../sitly-router';
import { Request, Response } from 'express';
import { sanitizeCompanyCreate, sanitizeVoucherGeneration } from './welfare-sanitization';
import { Serializer as JSONAPISerializer } from 'jsonapi-serializer';
import { notFoundError } from '../../services/errors';
import { getModels } from '../../sequelize-connections';

export class WelfareCompaniesRoute extends BaseRoute {
    static create(router: SitlyRouter) {
        router.get('/welfare/companies', (req, res) => {
            return new WelfareCompaniesRoute().index(req, res);
        });

        router.post('/welfare/companies', (req, res) => {
            return new WelfareCompaniesRoute().create(req, res);
        });

        router.post('/welfare/companies/:companyId/vouchers', (req, res) => {
            return new WelfareCompaniesRoute().generateVouchers(req, res);
        });

        router.get('/welfare/companies/:companyId/billing-amount', (req, res) => {
            return new WelfareCompaniesRoute().billingAmount(req, res);
        });
    }

    async index(req: Request, res: Response) {
        try {
            const companies = await getModels(req.brandCode).WelfareCompany.findAll();
            res.status(201);
            res.json(WelfareCompanySerializer.serialize(companies));
        } catch (error) {
            this.serverError(req, res, error as Error);
        }
    }

    async create(req: Request, res: Response) {
        sanitizeCompanyCreate(req);
        if (await this.handleValidationResult(req, res)) {
            return;
        }

        const company = getModels(req.brandCode).WelfareCompany.build();

        company.set('name', req.body.name as string);
        if (req.body.address) {
            company.set('address', req.body.address as string);
        }
        if (req.body.contactPerson) {
            company.set('contact_person', req.body.contactPerson as string);
        }
        if (req.body.contactEmail) {
            company.set('contact_email', req.body.contactEmail as string);
        }

        try {
            await company.save();

            res.status(201);
            res.json(WelfareCompanySerializer.serialize(company));
        } catch (error) {
            this.serverError(req, res, error as Error);
        }
    }

    async generateVouchers(req: Request, res: Response) {
        const models = getModels(req.brandCode);
        const company = await models.WelfareCompany.findByPk(+req.params.companyId);
        if (!company) {
            return notFoundError({ res, title: 'Company not found' });
        }

        sanitizeVoucherGeneration(req);
        if (await this.handleValidationResult(req, res)) {
            return;
        }

        try {
            const vouchers = await models.WelfareVoucher.bulkCreate(
                Array.from({ length: req.body.count as number }).map(_ => {
                    return {
                        company_id: company.company_id,
                        period: req.body.period as number,
                        month_price: req.body.monthPrice as number,
                        code: this.voucherCode(),
                    };
                }),
            );

            res.status(201);
            if (req.gemUser) {
                res.attachment('voucherCodes.csv');
                res.contentType('application/csv');
                res.send(vouchers.map(item => item.code).join(','));
            } else {
                res.json({ data: vouchers.map(item => item.code) });
            }
        } catch (error) {
            this.serverError(req, res, error as Error);
        }
    }

    private voucherCode() {
        return new Date().getTime().toString(36) + Math.random().toString(36);
    }

    async billingAmount(req: Request, res: Response) {
        const company = await getModels(req.brandCode).WelfareCompany.findByPk(+req.params.companyId, { include: 'vouchers' });
        if (!company) {
            notFoundError({ res, title: 'Company not found' });
            return;
        }

        try {
            const amount = company.vouchers?.reduce((prev, current) => {
                return prev + current.month_price * (current.period ?? 0);
            }, 0);

            res.status(201);
            const serializer = new JSONAPISerializer('welfare-billing-amount', {
                attributes: ['amount'],
            });
            res.json(serializer.serialize({ amount }));
        } catch (error) {
            this.serverError(req, res, error as Error);
        }
    }
}
