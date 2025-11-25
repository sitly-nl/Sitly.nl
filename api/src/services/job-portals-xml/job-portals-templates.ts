import { AdzunaVariant, bakecaItalianPlaceIdsByName } from './job-portals-types';
import { config } from '../../../config/config';
import { PageUrlService } from '../page-url.service';
import { User, WebRoleId } from '../../models/user/user.model';
import { addDays, format } from 'date-fns';
import { HourlyRate } from '../../models/user/custom-user.model';
import { Translator } from '../translations.service';

export class JobPortalsTemplates {
    private defaultXmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
    constructor(
        private translator: Translator,
        private pageUrlService: PageUrlService,
    ) {}

    async generateGeneralJobsXml(users: User[]) {
        if (!users.length) {
            return '';
        }
        let xml = `${this.defaultXmlHeader}
<jobs>`;
        xml += (
            await Promise.all(
                users.map(async user => {
                    const title = this.translator.translated(
                        user.isParent ? 'job.title.general.parent' : 'job.title.general.babysitter',
                        {
                            '[firstName]': user.first_name ?? '',
                            '[cityName]': user.customUser.place?.place_name ?? '',
                        },
                        false,
                    );
                    return `
                <job>
                    <id><![CDATA[${user.brandCode + user.customUser.webuser_url}]]></id>
                    <url><![CDATA[${await this.pageUrlService.getPublicProfileUrl(user)}]]></url>
                    <title><![CDATA[${title}]]></title>
                    <location><![CDATA[${user.customUser.place?.place_name}]]></location>
                    <country><![CDATA[${user.brandCode.toUpperCase()}]]></country>
                    <description><![CDATA[${this.cleanText(user.customUser.about ?? '')}]]></description>
                    <category><![CDATA[Childcare]]></category>
                    <company><![CDATA[Sitly]]></company>
                    <contractHours><![CDATA[parttime]]></contractHours>
                    <publishDate><![CDATA[${format(user.last_login ?? new Date(), 'yyyy-MM-dd')}]]></publishDate>
                    <expiryDate><![CDATA[${format(addDays(user.last_login ?? new Date(), 60), 'yyyy-MM-dd')}]]></expiryDate>
                </job>
            `;
                }),
            )
        ).join(' ');
        xml += '</jobs>';
        return xml;
    }

    async generateTrabajosJobsXml(users: User[]) {
        if (!users.length) {
            return '';
        }
        const [chores, driving, shopping, cooking, homework] = this.translator.translated('job.fosterChores.trabajos').split(',');
        let xml = `${this.defaultXmlHeader}\n<jobs>`;
        xml += (
            await Promise.all(
                users.map(async user => {
                    const fosterChores = [];
                    const customUser = user.customUser;
                    if (customUser.foster_chores) {
                        fosterChores.push(chores);
                    }
                    if (customUser.foster_driving) {
                        fosterChores.push(driving);
                    }
                    if (customUser.foster_shopping) {
                        fosterChores.push(shopping);
                    }
                    if (customUser.foster_cooking) {
                        fosterChores.push(cooking);
                    }
                    if (customUser.foster_homework) {
                        fosterChores.push(homework);
                    }
                    const title = this.translator.translated(
                        'job.title.trabajos',
                        {
                            '[cityName]': customUser.place?.place_name ?? '',
                        },
                        false,
                    );
                    const hourlyRate = customUser.avg_hourly_rate
                        ? customUser.avg_hourly_rate === HourlyRate.negotiate
                            ? this.translator.translated('hourlyRate.negotiate')
                            : config.getConfig(user.brandCode).hourlyRateOptions[customUser.avg_hourly_rate.replace('_', '-') as never]
                        : '';
                    const content = this.translator.translated(
                        'job.content.trabajos',
                        {
                            '[about]': customUser.about ?? '',
                            '[hourlyRate]': hourlyRate,
                            '[chores]': fosterChores.length > 0 ? fosterChores.join(', ') : '',
                            '[numberOfChildren]': `${customUser.children?.length}`,
                        },
                        false,
                    );
                    return `
                        <job>
                            <category><![CDATA[canguro]]></category>
                            <id><![CDATA[${customUser.webuser_url}]]></id>
                            <url><![CDATA[${await this.pageUrlService.getPublicProfileUrl(
                                user,
                            )}?utm_source=trabajos.com&utm_medium=cpc&utm_campaign=trabajos.com-ad]]></url>
                            <title><![CDATA[${title}]]></title>
                            <content><![CDATA[${content}]]></content>
                            <city><![CDATA[${customUser.place?.place_name}]]></city>
                            <province><![CDATA[${customUser.place?.province?.province_name}]]></province>
                            <company><![CDATA[Sitly]]></company>
                            <contract><![CDATA[Part-time]]></contract>
                            <date><![CDATA[${format(user.last_login ?? new Date(), 'dd-MM-yyyy')}]]></date>
                            <expiration_date><![CDATA[${format(
                                addDays(user.last_login ?? new Date(), 60),
                                'dd-MM-yyyy',
                            )}]]></expiration_date>
                        </job>
                    `;
                }),
            )
        ).join(' ');
        xml += '</jobs>';
        return xml;
    }

    async generateAdzunaJobsXml(users: User[], variant?: AdzunaVariant) {
        if (!users.length) {
            return '';
        }
        let xml = `${this.defaultXmlHeader}
<jobs>`;
        xml += (
            await Promise.all(
                users.map(async user => {
                    let title = '';

                    if (variant === 'title-type-of-care') {
                        const typeOfCareArray = [
                            user.customUser.pref_regular && this.translator.translated('job.title.adzuna.regularly'),
                            user.customUser.pref_occasional && this.translator.translated('job.title.adzuna.occasionally'),
                            user.customUser.pref_after_school && this.translator.translated('job.title.adzuna.after-school'),
                        ].filter(Boolean);
                        title = this.translator.translated('job.title.adzuna.babysitter-wanted');
                        title += typeOfCareArray.length ? ` ${typeOfCareArray.join(', ')}` : '';
                    } else {
                        title = this.translator.translated(
                            'job.title.adzuna.city',
                            {
                                '[cityName]': user.customUser.place?.place_name ?? '',
                            },
                            false,
                        ); // TODO: fix translations
                    }

                    return `
                <job>
                    <id><![CDATA[${user.brandCode + user.customUser.webuser_url}]]></id>
                    <url><![CDATA[${await this.pageUrlService.getPublicProfileUrl(user)}]]></url>
                    <title><![CDATA[${title}]]></title>
                    <location><![CDATA[${user.customUser.place?.place_name}]]></location>
                    <country><![CDATA[${user.brandCode.toUpperCase()}]]></country>
                    <description><![CDATA[${this.cleanText(user.customUser.about ?? '')}]]></description>
                    <category><![CDATA[Childcare]]></category>
                    <company><![CDATA[Sitly]]></company>
                    <contractHours><![CDATA[parttime]]></contractHours>
                    <publishDate><![CDATA[${format(user.last_login ?? new Date(), 'yyyy-MM-dd')}]]></publishDate>
                    <expiryDate><![CDATA[${format(addDays(user.last_login ?? new Date(), 60), 'yyyy-MM-dd')}]]></expiryDate>
                    ${
                        variant === 'with-salary' && this.getAvgSalary(user)
                            ? `<salary><![CDATA[${this.getAvgSalary(user)}]]></salary>
                        <salary_frequency><![CDATA[hour]]></salary_frequency>
                        <salary_currency><![CDATA[${config.getConfig(user.brandCode).currencyCode}]]></salary_currency>`
                            : ''
                    }
                </job>
            `;
                }),
            )
        ).join(' ');
        xml += '</jobs>';
        return xml;
    }

    async generateBakecaJobsXml(users: User[]) {
        if (!users.length) {
            return '';
        }
        let xml = `${this.defaultXmlHeader}
<ITEMLIST>`;
        xml += (
            await Promise.all(
                users.map(async user => {
                    const categoryId = user.isParent ? 77 : 41;

                    const title = this.translator.translated(
                        user.isParent ? 'job.title.bakeca.parent' : 'job.title.general.babysitter',
                        {
                            '[firstName]': user.first_name ?? '',
                            '[cityName]': user.customUser.place?.place_name ?? '',
                        },
                        false,
                    );
                    const avatar = user.getAvatarUrl(500) ?? 'https://www.sitter-italia.it/images/logo-sitter-italia-square.jpg';

                    return `
                <ITEM 
                    ID="${user.brandCode + user.customUser.webuser_url}" 
                    CITYID="${bakecaItalianPlaceIdsByName[`${user.customUser.place?.place_name}`] ?? ''}" 
                    CATEGORYID="${categoryId}" 
                    LASTUPDATE="${format(user.created ?? new Date(), 'yyyy-MM-dd')}" 
                    EXPIRED="0"
                >
                    <TITLE><![CDATA[${title}]]></TITLE>
                    <TEXT><![CDATA[${this.cleanText(user.customUser.about ?? '')}]]></TEXT>
                    <LINK><![CDATA[${await this.pageUrlService.getPublicProfileUrl(user)}]]></LINK>
                    <EMAIL><![CDATA[jules@sitter-italia.it]]></EMAIL>
                    <ATTRIBUTELIST>
                        <ATTRIBUTE>
                            <ATTRID>lng</ATTRID>
                            <ATTRNAME/>
                            <ATTRVAL><![CDATA[${user.customUser.place?.map_longitude}]]></ATTRVAL>
                        </ATTRIBUTE>
                        <ATTRIBUTE>
                            <ATTRID>lat</ATTRID>
                            <ATTRNAME/>
                            <ATTRVAL><![CDATA[${user.customUser.place?.map_latitude}]]></ATTRVAL>
                        </ATTRIBUTE>
                        ${
                            user.isParent
                                ? `
                            <ATTRIBUTE>
                                <ATTRID>contrattolav</ATTRID>
                                <ATTRNAME><![CDATA[2386]]></ATTRNAME>
                                <ATTRVAL></ATTRVAL>
                            </ATTRIBUTE>
                            <ATTRIBUTE>
                                <ATTRID>disponibilitalav</ATTRID>
                                <ATTRNAME><![CDATA[2390]]></ATTRNAME>
                                <ATTRVAL></ATTRVAL>
                            </ATTRIBUTE> `
                                : `
                            <ATTRIBUTE>
                                <ATTRID>babysitter</ATTRID>
                                <ATTRNAME></ATTRNAME>
                                <ATTRVAL><![CDATA[1]]></ATTRVAL>
                            </ATTRIBUTE>
                            `
                        }
                    </ATTRIBUTELIST>
                    <IMAGELIST>
                        <IMGFILE><![CDATA[${avatar}]]></IMGFILE>
                    </IMAGELIST>
                </ITEM>
`;
                }),
            )
        ).join(' ');
        xml += '</ITEMLIST>';
        return xml;
    }

    private getAvgSalary(user: User) {
        const brandConfigSettings = config.getConfig(user.brandCode);
        const hourlyRateOptions = brandConfigSettings.hourlyRateOptions;
        let hourlyRatesArray: string[] = [];
        if (user.webrole_id === WebRoleId.parent) {
            hourlyRatesArray =
                user.customUser.parentSearchPreferences?.hourly_rates
                    ?.filter(hourlyRate => hourlyRate !== HourlyRate.negotiate)
                    ?.map(hourlyRate => hourlyRateOptions[hourlyRate.toLowerCase().replace('_', '-') as keyof typeof hourlyRateOptions])
                    ?.join(' ')
                    ?.match(/\d+\.?\d*/g) ?? [];
        } else if (typeof user.customUser.avg_hourly_rate === 'string' && user.customUser.avg_hourly_rate !== HourlyRate.negotiate) {
            hourlyRatesArray =
                hourlyRateOptions[user.customUser.avg_hourly_rate.toLowerCase().replace('_', '-') as keyof typeof hourlyRateOptions]?.match(
                    /\d+\.?\d*/g,
                ) ?? [];
        }

        return Math.round((hourlyRatesArray?.reduce((a, b) => a + Number(b), 0) ?? 0) / (hourlyRatesArray?.length ?? 1));
    }

    private cleanText(text: string) {
        return text
            .split('')
            .filter(char => char.charCodeAt(0) <= 127)
            .join('');
    }
}
