import { Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { ColumnSet, CountryBaseModel } from '../base.model';
import { CustomUser } from './custom-user.model';

export enum FosterChores {
    chores = 'chores',
    driving = 'driving',
    shopping = 'shopping',
    cooking = 'cooking',
    homework = 'homework',
}
export const allFosterChores = Object.values(FosterChores);

export enum FosterSkills {
    art = 'art',
    music = 'music',
    baking = 'baking',
    sports = 'sports',
    games = 'games',
    storytelling = 'storytelling',
}
export const allFosterSkills = Object.values(FosterSkills);

export enum FosterTraits {
    calm = 'calm',
    patient = 'patient',
    enthusiastic = 'enthusiastic',
    kind = 'kind',
    caring = 'caring',
    creative = 'creative',
    funny = 'funny',
    talkative = 'talkative',
    strict = 'strict',
    tolerant = 'tolerant',
}
export const allFosterTraits = Object.values(FosterTraits);

export class FosterPropertiesColumns extends CountryBaseModel<FosterPropertiesColumns, 'webuser_id', 'visit' | 'receive' | 'daycare'> {
    @Column({ primaryKey: true, autoIncrement: true })
    @ForeignKey(() => CustomUser)
    webuser_id: number;

    @Column({ defaultValue: 0 }) visit: number;
    @Column({ defaultValue: 0 }) receive: number;
    @Column({ defaultValue: 0 }) daycare: number;
    @Column(DataType.INTEGER) after_school: number | null;
    @Column(DataType.INTEGER) occasional: number | null;
    @Column(DataType.INTEGER) regular: number | null;
    @Column(DataType.INTEGER) remote_tutor: number | null;
    @Column(DataType.INTEGER) experienced: number | null;
    @Column(DataType.INTEGER) educated: number | null;
    @Column(DataType.INTEGER) has_references: number | null;
    @Column(DataType.INTEGER) has_first_aid_certificate: number | null;
    @Column(DataType.INTEGER) has_certificate_of_good_behavior: number | null;
    @Column(DataType.INTEGER) has_drivers_license: number | null;
    @Column(DataType.INTEGER) has_car: number | null;
    @Column(DataType.STRING) info: string | null;
    @ColumnSet chores: FosterChores[] | null;
    @ColumnSet skills: FosterSkills[] | null;
    @ColumnSet traits: FosterTraits[] | null;
}

@Table({ tableName: 'cms_webuser_foster_properties' })
export class FosterProperties extends FosterPropertiesColumns {}
