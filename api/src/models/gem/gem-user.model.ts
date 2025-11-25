import { BelongsToMany, Column, Sequelize, Table } from 'sequelize-typescript';
import { CryptoUtil } from '../../utils/crypto-util';
import { MainBaseModel } from '../base.model';
import { Country } from './country.model';
import { GemUserCountry } from './gem-user-country.model';
import { GemUserLocale } from './gem-user-locale.model';
import { Locale } from '../locale.model';
import { StringUtil } from '../../utils/string-util';

export enum GemUserRole {
    admin = 'ADMIN',
    support = 'SUPPORT',
    tester = 'TESTER',
    translator = 'TRANSLATOR',
    customerResearcher = 'CUSTOMER_RESEARCHER',
}

export class GemUserColumns extends MainBaseModel<GemUserColumns, 'user_id'> {
    @Column({ primaryKey: true, autoIncrement: true }) user_id: number;
    @Column email: string;
    @Column password: string;
    @Column salt: string;
    @Column first_name: string;
    @Column last_name: string;
    @Column active: 0 | 1;
    @Column tfa_secret: string;
    @Column role: GemUserRole;
}

@Table({ tableName: 'core_users' })
export class GemUser extends GemUserColumns {
    @BelongsToMany(() => Country, () => GemUserCountry) countries: Country[];
    @BelongsToMany(() => Locale, () => GemUserLocale) locales?: Locale[];

    static defaultIncludes = ['countries', 'locales'];

    static passwordFields(password: string) {
        const salt = StringUtil.randomString(15, true);
        const encryptedPassword = CryptoUtil.encryptPassword(password, salt);
        return {
            password: encryptedPassword,
            salt,
        };
    }

    unlinkCountries(countryIds: number[]) {
        return this.sequelize.models.GemUserCountry.destroy({
            where: {
                user_id: this.user_id,
                country_id: countryIds,
            },
        });
    }

    static login(email: string, password: string) {
        return this.findOne({
            where: {
                active: 1,
                email,
                password: Sequelize.fn(
                    'MD5',
                    Sequelize.fn('SHA1', Sequelize.fn('CONCAT', Sequelize.col('salt'), Sequelize.literal(`"${password}"`))),
                ),
            },
            include: GemUser.defaultIncludes,
        });
    }

    static byId(userId: number) {
        return this.findOne({
            where: {
                active: 1,
                user_id: userId,
            },
            include: GemUser.defaultIncludes,
        });
    }

    static byEmail(email: string) {
        return this.findOne({
            where: { active: 1, email },
            include: GemUser.defaultIncludes,
        });
    }
}
