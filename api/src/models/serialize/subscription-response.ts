import { Serializer as JSONAPISerializer } from 'jsonapi-serializer';
import { Subscription } from '../subscription.model';

export class SubscriptionResponse {
    static keys: (keyof SubscriptionResponse)[] = ['id', 'duration', 'durationUnit', 'pricePerUnit', 'discountPercentage', 'abTestId'];
    static gemKeys: (keyof SubscriptionResponse)[] = [...SubscriptionResponse.keys, 'webroleId', 'maxAge', 'showInOverview', 'testVariant'];

    id = this.subscription.instance_id;
    duration = this.subscription.duration;
    durationUnit = this.subscription.duration_unit;
    pricePerUnit = this.subscription.price_per_unit;
    discountPercentage = this.subscription.discount_percentage;
    abTestId = this.subscription.ab_test_id;
    webroleId = this.subscription.webrole_id;
    maxAge = this.subscription.max_age;
    showInOverview = this.subscription.show_in_overview;
    testVariant?: SubscriptionResponse;

    private constructor(private subscription: Subscription) {
        this.testVariant = subscription.testVariant ? SubscriptionResponse.instance(subscription.testVariant) : undefined;
    }

    static instance(subscription: Subscription) {
        return new SubscriptionResponse(subscription);
    }
}

export const serialize = (model: Subscription | Subscription[], type: 'default' | 'gem' = 'default') => {
    const serializer = new JSONAPISerializer('subscriptions', {
        attributes: type === 'gem' ? SubscriptionResponse.gemKeys : SubscriptionResponse.keys,
        keyForAttribute: 'camelCase',
        typeForAttribute: (attr: string) => {
            return attr === 'testVariant' ? 'subscriptions' : attr;
        },
        testVariant: {
            ref: 'id',
            attributes: type === 'gem' ? SubscriptionResponse.gemKeys : SubscriptionResponse.keys,
        },
    });
    return serializer.serialize(
        Array.isArray(model) ? model.map(item => SubscriptionResponse.instance(item)) : SubscriptionResponse.instance(model),
    );
};
