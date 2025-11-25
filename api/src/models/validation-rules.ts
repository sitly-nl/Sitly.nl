import { allHourlyRates } from './user/custom-user.model';

export class ValidationRules {
    static readonly user = {
        password: {
            length: { min: 8, max: 50 },
        },
        firstName: {
            length: { min: 2, max: 50 },
        },
        lastName: {
            length: { min: 2, max: 50 },
        },
        couponCode: {
            length: { min: 2, max: 32 },
        },
    };
    static readonly ageGroupExperienceOptions = ['0', '1-3', '4-6', '7-11', '12plus'];
    static readonly hourlyRateOptions = allHourlyRates.map(item => item.replace('_', '-'));
}
