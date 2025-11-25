import { Column, DataType, Model, Sequelize } from 'sequelize-typescript';
import { type countryModels, type mainModels, type translationModels } from '../sequelize-connections';
import { BrandCode } from './brand-code';
import { parseISO } from 'date-fns';
import { DateUtil } from '../utils/date-util';

export const ColumnTimestamp = (target: unknown, propertyName: string) => {
    const columnFunc = Column({
        type: 'TIMESTAMP',
        get() {
            const value = this.getDataValue(propertyName) as number;
            return value === null || value === undefined ? value : new Date(value * 1000);
        },
        set(value: Date) {
            this.setDataValue(propertyName, DateUtil.dateToTimestamp(value));
        },
    });
    columnFunc(target, propertyName);
};

export const ColumnDateOnly = (target: unknown, propertyName: string) => {
    const columnFunc = Column({
        type: DataType.DATEONLY,
        get() {
            const value = this.getDataValue(propertyName) as string;
            return value ? parseISO(value) : value;
        },
    });
    columnFunc(target, propertyName);
};

export const ColumnSet = (target: unknown, propertyName: string) => {
    const columnFunc = Column({
        type: DataType.STRING,
        get() {
            const value = this.getDataValue(propertyName) as string | string[] | undefined;
            return value instanceof Array || !value ? value : value.split(',');
        },
        set(value: unknown[] | null) {
            this.setDataValue(propertyName, value ? value.join(',') : value);
        },
    });
    columnFunc(target, propertyName);
};

/**
 * T - object containing all columns
 * K - primary key (can be added created_at) - these keys can't be used when creating new instance
 * D - all columns which have default value - mark as optional when creating new instance
 */
export class BaseModel<T extends object, K extends keyof T, D extends keyof T = never> extends Model<
    T,
    Omit<T, (keyof Model | K | D) | 'brandCode'> & { [D in keyof T]?: T[D] }
> {
    /** @deprecated this is Sequelize build-in field - please use appropriate field from model */
    declare id?: number;
}

export class MainBaseModel<T extends object, K extends keyof T, D extends keyof T = never> extends BaseModel<T, K, D> {
    declare sequelize: Sequelize & { models: typeof mainModels };
}

export class CountryBaseModel<T extends object, K extends keyof T, D extends keyof T = never> extends BaseModel<T, K, D> {
    declare static readonly sequelize: Omit<Sequelize, 'models'> & { models: typeof countryModels };
    declare readonly sequelize: Omit<Sequelize, 'models'> & { models: typeof countryModels; brandCode___: BrandCode };
    get brandCode() {
        return this.sequelize.brandCode___;
    }
}

export class TranslationBaseModel<T extends object, K extends keyof T, D extends keyof T = never> extends BaseModel<T, K, D> {
    declare sequelize: Sequelize & { models: typeof translationModels };
}
