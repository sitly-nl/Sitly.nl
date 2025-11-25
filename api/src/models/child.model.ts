import { Column, ForeignKey, Table } from 'sequelize-typescript';
import { ColumnSet, ColumnTimestamp, CountryBaseModel } from './base.model';
import { differenceInYears, isAfter } from 'date-fns';
import { CustomUser } from './user/custom-user.model';

export enum ChildTraits {
    calm = 'calm',
    energetic = 'energetic',
    quiet = 'quiet',
    talkative = 'talkative',
    creative = 'creative',
    sporty = 'sporty',
    curious = 'curious',
    funny = 'funny',
    mischievous = 'mischievous',
    stubborn = 'stubborn',
}
export const allChildTraits = Object.values(ChildTraits);

export class ChildColumns extends CountryBaseModel<ChildColumns, 'instance_id'> {
    @Column({ primaryKey: true, autoIncrement: true }) instance_id: number;

    @Column
    @ForeignKey(() => CustomUser)
    webuser_id: number;

    @Column gender: 'm' | 'f' | 'u';
    @ColumnTimestamp birthdate: Date;
    @ColumnSet traits: ChildTraits[] | null;
}

@Table({ tableName: 'custom_module_children' })
export class Child extends ChildColumns {
    get age() {
        return differenceInYears(new Date(), this.birthdate);
    }

    get isExpected() {
        return isAfter(this.birthdate, new Date());
    }

    static byId(childId: number) {
        if (Number.isNaN(childId)) {
            return null;
        }
        return this.findOne({
            where: { instance_id: childId },
        });
    }
}
