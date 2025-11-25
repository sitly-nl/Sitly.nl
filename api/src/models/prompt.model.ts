import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { CountryBaseModel } from './base.model';
import { CustomUser } from './user/custom-user.model';
import { PromptType } from '../services/prompts.service';

export class PromptColumns extends CountryBaseModel<PromptColumns, 'instance_id'> {
    @Column({ primaryKey: true, autoIncrement: true }) instance_id: number;

    @Column
    @ForeignKey(() => CustomUser)
    webuser_id: number;

    @Column(DataType.STRING) prompt_type: PromptType;
    @Column(DataType.DATE) created_at: Date;
    @Column(DataType.INTEGER) show_delay: number | null;
}

@Table({ tableName: 'custom_module_prompts' })
export class Prompt extends PromptColumns {
    isBlocking() {
        return Prompt.isBlocking(this.prompt_type);
    }

    static isBlocking(type: PromptType) {
        switch (type) {
            case PromptType.availabilityReminder:
            case PromptType.noAvailabilityReminder:
            case PromptType.fillNewProperties:
                return true;
            default:
                return false;
        }
    }
}
