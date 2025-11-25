import { Column, DataType, ForeignKey, HasMany, Table } from 'sequelize-typescript';
import { CountryBaseModel } from '../base.model';
import { LocaleId } from '../locale.model';

class PageTranslationColumns extends CountryBaseModel<PageTranslationColumns, 'page_translation_id'> {
    @Column({ primaryKey: true, autoIncrement: true }) page_translation_id: number;

    @Column
    @ForeignKey(() => Page)
    page_id: number;

    @Column(DataType.INTEGER) locale_id: LocaleId;
    @Column(DataType.STRING) page_url: string | null;
}
@Table({ tableName: 'cms_page_translations' })
export class PageTranslation extends PageTranslationColumns {}

export class PageColumns extends CountryBaseModel<PageColumns, 'page_id'> {
    @Column({ primaryKey: true, autoIncrement: true }) page_id: number;
    @Column active: 0 | 1;
    @Column(DataType.STRING) page_code: string | null;
}

@Table({ tableName: 'cms_pages' })
export class Page extends PageColumns {
    @HasMany(() => PageTranslation) translations: PageTranslation[];

    static byPageCode(pageCode: string, localeId?: number) {
        return this.findOne({
            where: {
                active: 1,
                page_code: pageCode,
            },
            include: {
                association: 'translations',
                ...(localeId ? { where: { locale_id: localeId } } : {}),
            },
        });
    }
}
