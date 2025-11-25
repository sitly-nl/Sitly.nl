import { CountryCode } from '../models/brand-code';
import { Environment } from '../services/env-settings.service';
import { User, WebRoleId } from '../models/user/user.model';

export enum ABTestEnvironment {
    prod = 'prod',
    acceptance = 'acceptance',
    all = 'all',
}

interface ABTestInterface {
    name: string;
    country: CountryCode;
    experimentId: string;
    roles: Set<WebRoleId>;
    environment: ABTestEnvironment;
}

export class ABTests {
    static tests: ABTestInterface[] = [
        // --- For api tests only --- //
        {
            name: 'abApiTest1',
            country: CountryCode.netherlands,
            experimentId: '5h9R97QMQ42lTO9Pz6DW5A',
            roles: new Set([WebRoleId.parent]),
            environment: ABTestEnvironment.acceptance,
        },
        {
            name: 'abApiTest1',
            country: CountryCode.netherlands,
            experimentId: 'EnbNivpvT9a1VAO-GjqJWQ',
            roles: new Set([WebRoleId.babysitter]),
            environment: ABTestEnvironment.acceptance,
        },
        {
            name: 'abApiTest2',
            country: CountryCode.italy,
            experimentId: 'itTestId',
            roles: new Set([WebRoleId.babysitter]),
            environment: ABTestEnvironment.acceptance,
        },
        // ------ //
        // --- Permanent --- //
        {
            name: 'abPricingTestParents',
            country: CountryCode.finland,
            experimentId: 'i8iiz8gKQ1iIdpIJm7ckig',
            roles: new Set([WebRoleId.parent]),
            environment: ABTestEnvironment.all,
        },
        {
            name: 'abPricingTestBabysitters', // id 151
            country: CountryCode.brazil,
            experimentId: 'lIM6HyDBRX-6sGljYHVvUA',
            roles: new Set([WebRoleId.babysitter]),
            environment: ABTestEnvironment.all,
        },
        {
            name: 'abPricingTestParents', // id 156
            country: CountryCode.brazil,
            experimentId: 'hTrQIYKgSLOUYL0-73CIKg',
            roles: new Set([WebRoleId.parent]),
            environment: ABTestEnvironment.all,
        },
        {
            name: 'abPricingTestParents', // id 152
            country: CountryCode.netherlands,
            experimentId: 'DXo_47LtRvyoSYW_wKyV-Q',
            roles: new Set([WebRoleId.parent]),
            environment: ABTestEnvironment.all,
        },
        {
            name: 'abPricingTestBabysitters',
            country: CountryCode.netherlands,
            experimentId: 'G7YzyFfvTDKQhkMU9SSLxQ',
            roles: new Set([WebRoleId.babysitter]),
            environment: ABTestEnvironment.all,
        },
        {
            name: 'abPricingTestBabysitters',
            country: CountryCode.italy,
            experimentId: '_u1j2nUeTQiBrffdUDT2AQ',
            roles: new Set([WebRoleId.babysitter]),
            environment: ABTestEnvironment.all,
        },
        {
            name: 'abPricingTestParents',
            country: CountryCode.italy,
            experimentId: '8rvdq-aJQOaHqqP2sY3cfQ',
            roles: new Set([WebRoleId.parent]),
            environment: ABTestEnvironment.all,
        },
        {
            name: 'abPricingTestBabysitters', // id 161
            country: CountryCode.canada,
            experimentId: '19LriG9HRCKahekmk6Ko-Q',
            roles: new Set([WebRoleId.babysitter]),
            environment: ABTestEnvironment.all,
        },
        {
            name: 'abPricingTestParents', // id 171
            country: CountryCode.canada,
            experimentId: 'Z-XZDLqpRLqPR7KLDT91Sw',
            roles: new Set([WebRoleId.parent]),
            environment: ABTestEnvironment.all,
        },
        {
            name: 'abPricingTestBabysitters',
            country: CountryCode.spain,
            experimentId: 'od93JETCQ0eldN3RvYhrIw',
            roles: new Set([WebRoleId.babysitter]),
            environment: ABTestEnvironment.all,
        },
        {
            name: 'abPricingTestParents',
            country: CountryCode.spain,
            experimentId: '6HTh6NUfQ-qTsMoXglFAFA',
            roles: new Set([WebRoleId.parent]),
            environment: ABTestEnvironment.all,
        },
        // ------ //
    ];

    static showAVersion(user: User) {
        if (!Environment.isProd) {
            if (user.email?.endsWith('a@sitly.com')) {
                return true;
            } else if (user.email?.endsWith('b@sitly.com')) {
                return false;
            }
        }
        return user.webuser_id % 2 === 0;
    }

    static testEnabled(test: ABTestInterface, countryCode: CountryCode, user: { role: WebRoleId | null }) {
        const envCheck =
            test.environment === ABTestEnvironment.all ||
            (Environment.isProd && test.environment === ABTestEnvironment.prod) ||
            (Environment.isTest && test.environment === ABTestEnvironment.acceptance) ||
            Environment.isApiTests;
        return envCheck && user.role && test.roles.has(user.role) && test.country === countryCode;
    }
}
