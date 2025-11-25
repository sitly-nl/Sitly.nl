export class GoogleUADriver {
    static trackPayment({
        orderId,
        amount,
        sku,
        category,
        productName,
    }: {
        orderId: string;
        amount: number;
        sku: string;
        category: string;
        productName: string;
    }) {
        window.ga?.('send', 'pageview', 'transaction-completed');
        window.ga?.('require', 'ecommerce');
        window.ga?.('ecommerce:addTransaction', {
            id: orderId,
            affiliation: 'Oudermatch',
            revenue: amount,
        });
        const name = productName;
        window.ga?.('ecommerce:addItem', {
            id: orderId,
            name,
            sku,
            category,
            price: amount,
            quantity: '1',
        });
        window.ga?.('ecommerce:send');
    }

    // TODO: new registration - what to do if role is undefined
    static trackUserLoaded({ id, role, isPremium }: { id: string; role: string | undefined; isPremium: boolean }) {
        window.ga?.('set', 'userId', id);
        window.ga?.('set', 'dimension1', role);
        window.ga?.('set', 'dimension2', `premium_${isPremium ? 'yes' : 'no'}`);
    }

    static clearUser() {
        window.ga?.('set', 'userId', null);
    }

    static setExperiment(experimentId: string) {
        window.ga?.('set', 'exp', experimentId);
    }

    static trackPageView(url: string) {
        window.ga?.('send', 'pageview', url);
    }

    static trackCtaEvent(label: string, action: string) {
        window.ga?.('send', 'event', 'cta', action, label);
    }

    static trackEvent(category: string, action: string, label: string) {
        window.ga?.('send', 'event', category, action, label);
    }
}
