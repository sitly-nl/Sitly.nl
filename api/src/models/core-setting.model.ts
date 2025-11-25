import { Column, Table } from 'sequelize-typescript';
import { CountryBaseModel } from './base.model';

export class CoreSettingColumns extends CountryBaseModel<CoreSettingColumns, 'setting_id'> {
    @Column({ primaryKey: true, autoIncrement: true }) setting_id: number;
    @Column setting_key: string;
    @Column setting_value: string;
}

@Table({ tableName: 'core_settings' })
export class CoreSetting extends CoreSettingColumns {
    static async numberOfTrustPilotOrders() {
        return parseInt(await this.valueForKey('trustpilot_num_orders'), 10);
    }
    static async setNumberOfTrustPilotOrders(value: number) {
        await this.setValueForKey(value, 'trustpilot_num_orders');
    }

    static async numberOfEkomiOrders() {
        return parseInt(await this.valueForKey('ekomi_num_orders'), 10);
    }
    static async setNumberOfEkomiOrders(value: number) {
        await this.setValueForKey(value, 'ekomi_num_orders');
    }

    static async numberOfGoogleReviewOrders() {
        return parseInt(await this.valueForKey('google_review_num_orders'), 10);
    }
    static async setNumberOfGoogleReviewOrders(value: number) {
        await this.setValueForKey(value, 'google_review_num_orders');
    }

    static async resetReviewsCount() {
        return Promise.all(
            ['trustpilot_num_orders', 'ekomi_num_orders', 'google_review_num_orders'].map(item => this.setValueForKey(0, item)),
        );
    }

    static async maxNumberOfEkomiOrders() {
        return parseInt(await this.valueForKey('ekomi_max_orders'), 10);
    }

    private static async valueForKey(key: string) {
        const item = await this.findOne({ where: { setting_key: key } });
        return item?.setting_value ?? '';
    }

    private static async setValueForKey(value: number, key: string) {
        return this.update({ setting_value: `${value}` }, { where: { setting_key: key } });
    }
}
