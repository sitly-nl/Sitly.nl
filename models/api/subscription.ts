import { BaseApiModel } from 'app/models/api/response';
import { CouponInterface } from 'app/models/api/coupon-interface';

export class Subscription extends BaseApiModel implements SubscriptionInterface {
    duration: number;
    durationUnit: 'days' | 'weeks' | 'months' | 'years';
    pricePerUnit: number;
}

export interface SubscriptionInterface {
    id: string;
    duration: number;
    durationUnit: 'days' | 'weeks' | 'months' | 'years';
    pricePerUnit: number;
    discountPercentage?: number;
    coupon?: CouponInterface;
}
