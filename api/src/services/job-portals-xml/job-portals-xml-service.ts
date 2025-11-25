import * as request from 'request';
import { BrandCode } from '../../models/brand-code';
import { Environment } from '../env-settings.service';
import { JobPortalsTemplates } from './job-portals-templates';
import { getModels, maxPageSize } from '../../sequelize-connections';
import { bakecaItalianPlaceNames, JobPortals, jobPortalsByCountry, JobXmlResponse, XmlUploadObject } from './job-portals-types';
import { Includeable, Op, QueryTypes, WhereOptions } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { User, UserColumns, WebRoleId } from '../../models/user/user.model';
import { CacheItem, CacheService } from '../cache.service';
import { SentryService } from '../sentry.service';
import { TranslationsService, Translator } from '../translations.service';
import { config } from '../../../config/config';
import { PageUrlService } from '../page-url.service';
import { getUnixTime, subMonths } from 'date-fns';
import { LocaleId } from '../../models/locale.model';
import { CustomUser, CustomUserColumns } from '../../models/user/custom-user.model';

export class JobPortalsXmlService {
    static defaultJobPortalsUserWhere = {
        active: 1,
        last_login: {
            [Op.gt]: getUnixTime(subMonths(new Date(), Environment.isTest ? 5 : 1)),
        },
        first_name: {
            [Op.not]: null,
        },
        webrole_id: WebRoleId.parent,
        ...(Environment.isApiTests ? { email: { [Op.like]: 'testing+job+xmls+%' } } : {}),
    };

    static defaultJobPortalsCustomUserWhere = {
        completed: 1,
        verified: 1,
        invisible: 0,
        disabled: 0,
        private_only: 0,
        deleted: 0,
        place_id: {
            [Op.not]: null,
        },
        about: Sequelize.where(Sequelize.fn('char_length', Sequelize.col('about')), '>', 80),
        avatar_url: {
            [Op.not]: null,
        },
        [Op.not]: {
            pref_babysitter: 0,
            pref_childminder: 1,
        },
    };

    static bakecaJobPortalsCustomUserIncludes = [
        {
            association: 'place',
            where: {
                place_url: {
                    [Op.not]: null,
                },
                place_name: bakecaItalianPlaceNames,
            },
        },
        {
            association: 'parentSearchPreferences',
        },
    ];

    static async generateJobPortalsXmlsForCountry(brandCode: BrandCode, localeOverride?: LocaleId) {
        const localeId = localeOverride ?? config.getConfig(brandCode).defaultLocaleId;
        const translator: Translator = await TranslationsService.translator({ localeId, groupName: 'job-portals-xmls' });
        const pageUrlService = new PageUrlService(brandCode, localeId);
        const jobPortalTemplates = new JobPortalsTemplates(translator, pageUrlService);

        const results: JobXmlResponse[] = [];
        for (const portal of jobPortalsByCountry[brandCode]) {
            results.push(...(await JobPortalsXmlService.generateJobPortalsXmls(portal, brandCode, jobPortalTemplates)));
        }

        return results;
    }

    static async generateJobPortalsXmls(jobPortal: JobPortals, brandCode: BrandCode, templates: JobPortalsTemplates) {
        const xmls: XmlUploadObject[] = [];
        switch (jobPortal) {
            case JobPortals.general:
                xmls.push({
                    portal: JobPortals.general,
                    xml: await templates.generateGeneralJobsXml(await this.getGeneralUsersForCountry(brandCode)),
                });
                break;
            case JobPortals.adzuna:
                xmls.push({
                    portal: JobPortals.adzuna,
                    xml: await templates.generateAdzunaJobsXml(await this.getGeneralUsersForCountry(brandCode)),
                });
                xmls.push({
                    portal: JobPortals.adzuna,
                    variant: 'title-type-of-care',
                    xml: await templates.generateAdzunaJobsXml(await this.getGeneralUsersForCountry(brandCode), 'title-type-of-care'),
                });
                xmls.push({
                    portal: JobPortals.adzuna,
                    variant: 'with-salary',
                    xml: await templates.generateAdzunaJobsXml(await this.getGeneralUsersForCountry(brandCode), 'with-salary'),
                });
                break;
            case JobPortals.bakeca:
                xmls.push({
                    portal: JobPortals.bakeca,
                    xml: await templates.generateBakecaJobsXml(await this.getBakecaUsersForCountry(brandCode)),
                });
                break;
            case JobPortals.trabajos:
                xmls.push({
                    portal: JobPortals.trabajos,
                    xml: await templates.generateTrabajosJobsXml(await this.getTrabajosUsersForCountry(brandCode)),
                });
                break;
            default:
                return jobPortal satisfies never;
        }
        if (!xmls.length) {
            return [];
        }

        return this.uploadFilesToCdn(brandCode, xmls);
    }

    static async getTrabajosUsersForCountry(brandCode: BrandCode) {
        const { User } = getModels(brandCode);
        const sqlUser = User.queryGenerator.selectQuery('w', {
            where: this.defaultJobPortalsUserWhere,
        });
        const sqlCustomUser = User.queryGenerator.selectQuery('cw', {
            where: this.defaultJobPortalsCustomUserWhere,
        });
        const userWhere = sqlUser.split('WHERE')[1].slice(0, -1);
        const customUserWhere = sqlCustomUser.split('WHERE')[1].slice(0, -1);

        const userIdsRes = await User.sequelize.query<{ webuser_id: number }>(
            {
                query: `
                    SELECT *
                    FROM (
                        SELECT w.webuser_id, ROW_NUMBER() OVER (PARTITION BY province_id ORDER BY w.last_login DESC) AS row_num 
                        FROM cms_webusers w 
                        INNER JOIN custom_cms_webusers cw ON w.webuser_id = cw.webuser_id 
                        INNER JOIN custom_module_places p ON cw.place_id = p.instance_id AND p.province_id IS NOT NULL
                        WHERE ${userWhere} AND ${customUserWhere}
                    ) AS grouped_users 
                    WHERE row_num <= 5 
                `,
                values: [],
            },
            { type: QueryTypes.SELECT },
        );
        if (userIdsRes.length === 0) {
            return [];
        }

        const userIds = userIdsRes.map(user => user.webuser_id);
        return getModels(brandCode).User.findAll({
            where: { webuser_id: userIds },
            include: [
                {
                    association: 'customUser',
                    include: [
                        { association: 'place', include: ['province'] },
                        ...CustomUser.includes(['parentSearchPreferences', 'children']),
                    ],
                },
            ],
            order: Sequelize.literal(`FIELD(User.webuser_id, ${userIds.join(',')})`),
            limit: maxPageSize,
        });
    }

    static async getBakecaUsersForCountry(brandCode: BrandCode) {
        return [
            ...(await this.getUsersForCountry(
                brandCode,
                { webrole_id: WebRoleId.parent },
                {},
                this.bakecaJobPortalsCustomUserIncludes,
                5_000,
            )),
            ...(await this.getUsersForCountry(
                brandCode,
                { webrole_id: WebRoleId.babysitter },
                {},
                this.bakecaJobPortalsCustomUserIncludes,
                5_000,
            )),
        ];
    }

    static async getGeneralUsersForCountry(brandCode: BrandCode) {
        try {
            const cacheInstance = await CacheService.getInstance(CacheItem.jobXmlSearchUsers({ key: 'general', brandCode }));
            const cachedResults = await cacheInstance.get<User[]>();
            if (Array.isArray(cachedResults) && cachedResults.length > 0) {
                return cachedResults;
            }
        } catch (error) {
            SentryService.captureException(error, 'job-xml.cache', brandCode);
        }
        return this.getUsersForCountry(brandCode);
    }

    private static async getUsersForCountry(
        brandCode: BrandCode,
        additionalUserWhere?: WhereOptions<UserColumns>,
        additionalCustomUserWhere?: WhereOptions<CustomUserColumns>,
        additionalCustomUserIncludes?: Includeable[],
        maxResults = 10_000,
    ) {
        const users: User[] = [];
        const models = getModels(brandCode);

        const pageSize = Environment.isApiTests ? 10 : maxPageSize;
        let offset = 0;

        while (offset < maxResults - 1) {
            const response = await models.User.findAll({
                order: [['last_login', 'DESC']],
                limit: pageSize,
                offset,
                where: {
                    ...this.defaultJobPortalsUserWhere,
                    ...additionalUserWhere,
                },
                include: [
                    {
                        association: 'customUser',
                        where: {
                            ...this.defaultJobPortalsCustomUserWhere,
                            ...additionalCustomUserWhere,
                        },
                        include: [
                            {
                                association: 'place',
                                where: {
                                    place_url: {
                                        [Op.not]: null,
                                    },
                                    place_name: {
                                        [Op.not]: null,
                                    },
                                },
                            },
                            { association: 'parentSearchPreferences' },
                            ...(additionalCustomUserIncludes ?? []),
                        ],
                    },
                ],
            });

            users.push(...response);
            if (response.length < pageSize) {
                break;
            }
            offset += pageSize;
        }

        return users;
    }

    static async uploadFilesToCdn(brandCode: BrandCode, xmlObjects: XmlUploadObject[]) {
        return Promise.all(
            xmlObjects.map(xmlObject => {
                const fileName = `${Environment.isProd ? '' : 'test-'}jobs-${xmlObject.portal}-${brandCode}${
                    xmlObject.variant ? '-' + xmlObject.variant : ''
                }.xml`;

                const returnObject: JobXmlResponse = {
                    fileName,
                    portal: xmlObject.portal,
                    variant: xmlObject.variant,
                    XmlLength: xmlObject.xml.length,
                    testXml: Environment.isApiTests ? xmlObject.xml : null,
                    statusCode: 0,
                };

                return new Promise<JobXmlResponse>((resolve, reject) => {
                    const url = `${Environment.apiKeys.cdn_url}/uploadjobsxml.php`;

                    const requestOptions = {
                        auth: {
                            user: Environment.apiKeys.auth.cdn.name,
                            pass: Environment.apiKeys.auth.cdn.pass,
                        },
                    };
                    const xmlRequest = request.post(url, requestOptions, (_error, response, _body) => {
                        returnObject.statusCode = response.statusCode;
                        if (response.statusCode !== 200) {
                            // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                            reject(returnObject);
                        }
                        resolve(returnObject);
                    });

                    const form = xmlRequest.form();
                    const buffer = Buffer.from(xmlObject.xml, 'utf-8');
                    form.append('xmlFile', buffer, {
                        filename: fileName,
                        contentType: 'application/xml',
                    });
                    form.append('brandCode', brandCode);
                });
            }),
        );
    }
}
