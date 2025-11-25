export type SocialUser = {
    firstName: string;
    lastName: string;
    photoUrl: string;
    email: string;
};

export type GoogleAuthResponse = {
    given_name: string;
    family_name: string;
    email: string;
    picture: string;
};

export type CountryCodesError = { title: string; meta: { countryCodes: string[] } };
