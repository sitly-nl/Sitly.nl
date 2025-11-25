import { Column, HasMany, Table } from 'sequelize-typescript';
import { TranslationBaseModel } from '../base.model';
import { TranslationCode } from './translation-code.model';

// schema driven by Sequelize
class TranslationGroupColumns extends TranslationBaseModel<TranslationGroupColumns & { codes?: unknown[] }, 'translation_group_id'> {
    @Column({ primaryKey: true, autoIncrement: true }) translation_group_id: number;
    @Column({ allowNull: false, unique: true }) group_name: string;
}

@Table({ tableName: 'translation_groups' })
export class TranslationGroup extends TranslationGroupColumns {
    @HasMany(() => TranslationCode) codes?: TranslationCode[];
}
