import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { CountryBaseModel } from '../base.model';
import { User } from './user.model';

export enum NotificationFrequency {
    never = 'never',
    daily = 'daily',
    weekly = 'weekly',
}

// schema driven by Sequelize
export class NotificationSettingsColumns extends CountryBaseModel<
    NotificationSettingsColumns,
    'webuser_id',
    'email_matches' | 'email_connection_invites'
> {
    @Column({ primaryKey: true })
    @ForeignKey(() => User)
    webuser_id: number;

    @Column({ type: DataType.ENUM(...Object.values(NotificationFrequency)), defaultValue: NotificationFrequency.weekly })
    email_matches: NotificationFrequency;

    @Column({ type: DataType.ENUM(...Object.values(NotificationFrequency)), defaultValue: NotificationFrequency.daily })
    email_connection_invites: NotificationFrequency;

    @Column(DataType.DATE) last_connection_invite_email_sent: Date | null;
}

@Table({ tableName: 'notification_settings' })
export class NotificationSettings extends NotificationSettingsColumns {}
