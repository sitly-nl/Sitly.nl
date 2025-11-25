export interface CouponInterface {
    id: number;
    subscriptionId: number;
    discountPercentage: number;
    couponCode: string;
    startDate: string;
    endDate?: string;
}
