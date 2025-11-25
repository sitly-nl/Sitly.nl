export class Constants {
    static readonly uploadImgMaxSize = 1500;
    static readonly googlePlayUrl = 'https://play.google.com/store/apps/details?id=com.sitly.app';
    static readonly googleClientId = '208595061386-2li9ep5bj9i4vd81ucqd1cg47n2jva6p.apps.googleusercontent.com';
}

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
    };
}
