import { BelongsTo, Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { CountryBaseModel } from './base.model';
import { Message } from './message.model';
import { Photo } from './photo.model';
import { CustomUser } from './user/custom-user.model';
import { UserWarningLevel } from '../types';

export enum UserWarningType {
    about = 'about',
    avatar = 'avatar',
    email = 'email',
    firstName = 'firstName',
    lastName = 'lastName',
    message = 'message',
    male = 'male',
    report = 'report',
    spam = 'spam',
}

export class UserWarningColumns extends CountryBaseModel<UserWarningColumns, 'instance_id', 'warning_level'> {
    @Column({ primaryKey: true, autoIncrement: true }) instance_id: number;

    @Column({ allowNull: false })
    @ForeignKey(() => CustomUser)
    webuser_id: number;

    @Column(DataType.INTEGER)
    @ForeignKey(() => Photo)
    photo_id: number | null;

    @Column(DataType.INTEGER)
    @ForeignKey(() => Message)
    message_id: number | null;

    @Column({
        allowNull: false,
        type: DataType.ENUM(...Object.values(UserWarningLevel)),
        defaultValue: UserWarningLevel.moderate,
    })
    warning_level: UserWarningLevel;
    @Column(DataType.STRING) warning_phrases: string | null;
    @Column(DataType.STRING) warning_text: string | null;
    @Column({ type: DataType.ENUM(...Object.values(UserWarningType)) }) warning_type: UserWarningType | null;
}

@Table({ tableName: 'custom_module_webuser_warnings' })
export class UserWarning extends UserWarningColumns {
    @BelongsTo(() => Photo) photo?: Photo;
    @BelongsTo(() => Message) message?: Message;

    static updateWarningLevel(webuserIds: number[], warningLevel: UserWarningLevel, warningType?: UserWarningType) {
        return this.update(
            { warning_level: warningLevel },
            {
                where: {
                    webuser_id: webuserIds,
                    ...(warningType ? { warning_type: warningType } : {}),
                },
            },
        );
    }
}
