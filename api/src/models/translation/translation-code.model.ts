import { BelongsTo, Column, DataType, ForeignKey, HasMany, Table } from 'sequelize-typescript';
import { TranslationBaseModel } from '../base.model';
import { TranslationGroup } from './translation-group.model';
import { TranslationValue } from './translation-value.model';

// schema driven by Sequelize
class TranslationCodeColumns extends TranslationBaseModel<TranslationCodeColumns & { values?: unknown[] }, 'translation_code_id'> {
    @Column({ primaryKey: true, autoIncrement: true }) translation_code_id: number;

    @Column({ allowNull: false, unique: 'code-group_id-unique' })
    @ForeignKey(() => TranslationGroup)
    translation_group_id: number;

    @Column({ allowNull: false, unique: 'code-group_id-unique' }) translation_code: string;
    @Column(DataType.STRING) description: string | null;
}

@Table({ tableName: 'translation_codes' })
export class TranslationCode extends TranslationCodeColumns {
    @BelongsTo(() => TranslationGroup) group: TranslationGroup;
    @HasMany(() => TranslationValue) values?: TranslationValue[];
    @HasMany(() => TranslationValue) valuesExtra?: TranslationValue[];
}
