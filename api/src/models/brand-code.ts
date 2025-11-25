export enum BrandCode {
    main = 'main',
    argentina = 'ar',
    canada = 'ca',
    belgium = 'be',
    brazil = 'br',
    colombia = 'co',
    denmark = 'dk',
    finland = 'fi',
    germany = 'de',
    italy = 'it',
    malaysia = 'my',
    mexico = 'mx',
    netherlands = 'nl',
    norway = 'no',
    spain = 'es',
    xx = 'xx',
}

export enum CountryCode {
    argentina = 'ar',
    belgium = 'be',
    brazil = 'br',
    canada = 'ca',
    colombia = 'co',
    germany = 'de',
    denmark = 'dk',
    finland = 'fi',
    italy = 'it',
    malaysia = 'my',
    mexico = 'mx',
    netherlands = 'nl',
    norway = 'no',
    spain = 'es',
}

export const allCountryCodes = Object.values(CountryCode);

export function brandCodeToCountryCode(brandCode: BrandCode) {
    const countryCode = brandCode as unknown as CountryCode;
    return allCountryCodes.includes(countryCode) ? countryCode : CountryCode.netherlands;
}
