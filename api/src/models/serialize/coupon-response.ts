import { Coupon } from '../coupon.model';

export class CouponResponse {
    static keys: (keyof CouponResponse)[] = ['id', 'subscriptionId', 'discountPercentage', 'couponCode', 'startDate', 'endDate'];

    id = this.coupon.coupon_id;
    subscriptionId = this.coupon.subscription_id;
    discountPercentage = this.coupon.discount_percentage;
    couponCode = this.coupon.coupon_code;
    active = this.coupon.active;
    startDate = this.coupon.start_date.toISOString();
    endDate = this.coupon.end_date?.toISOString();

    private constructor(private coupon: Coupon) {}

    static instance(coupon: Coupon) {
        return new CouponResponse(coupon);
    }
}
