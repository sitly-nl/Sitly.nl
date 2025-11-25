import { Column, ForeignKey, Table } from 'sequelize-typescript';
import { MainBaseModel } from '../base.model';
import { Locale } from '../locale.model';
import { GemUser } from './gem-user.model';

class GemUserLocaleColumns extends MainBaseModel<GemUserLocaleColumns, 'user_locale_id'> {
    @Column({ primaryKey: true, autoIncrement: true }) user_locale_id: number;
    @Column({ allowNull: false }) @ForeignKey(() => GemUser) user_id: number;
    @Column({ allowNull: false }) @ForeignKey(() => Locale) locale_id: number;
}

@Table({ tableName: 'core_users_locales' })
export class GemUserLocale extends GemUserLocaleColumns {}
