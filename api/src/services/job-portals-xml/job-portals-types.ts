import { CountryCode } from 'aws-sdk/clients/route53domains';
import { BrandCode } from '../../models/brand-code';
import { WebRoleId } from '../../models/user/user.model';

export enum JobPortals {
    general = 'general',
    adzuna = 'adzuna',
    bakeca = 'bakeca',
    trabajos = 'trabajos',
}

export const jobPortalsByCountry: Record<CountryCode, JobPortals[]> = {
    [BrandCode.argentina]: [JobPortals.general],
    [BrandCode.belgium]: [JobPortals.general],
    [BrandCode.brazil]: [JobPortals.general],
    [BrandCode.canada]: [JobPortals.general, JobPortals.adzuna],
    [BrandCode.colombia]: [JobPortals.general],
    [BrandCode.denmark]: [JobPortals.general],
    [BrandCode.finland]: [JobPortals.general],
    [BrandCode.germany]: [JobPortals.general, JobPortals.adzuna],
    [BrandCode.italy]: [JobPortals.general, JobPortals.adzuna, JobPortals.bakeca],
    [BrandCode.malaysia]: [JobPortals.general],
    [BrandCode.mexico]: [JobPortals.general],
    [BrandCode.netherlands]: [JobPortals.general, JobPortals.adzuna],
    [BrandCode.norway]: [JobPortals.general],
    [BrandCode.spain]: [JobPortals.general, JobPortals.adzuna, JobPortals.trabajos],
    [BrandCode.xx]: [JobPortals.general, JobPortals.adzuna, JobPortals.bakeca, JobPortals.trabajos],
};

export interface JobPortalSearchResults {
    userId: number;
    userUrl: string;
    firstName: string;
    about: string;
    webRoleId: WebRoleId;
    lastLogin: Date;
    placeUrl: string;
    placeName: string;
    avgSalary: number;
    prefRegular: boolean;
    prefOccasional: boolean;
    prefAfterSchool: boolean;
    currencyCode: string;
    publicProfileUrl: string;
}

export interface JobPortalTranslations {
    adzunaTitle: string;
    generalTitle: string;
}

export type XmlUploadObject = {
    variant?: AdzunaVariant;
    xml: string;
    portal: JobPortals;
};

export type JobXmlResponse = {
    fileName: string;
    portal: JobPortals;
    variant: AdzunaVariant | undefined;
    XmlLength: number;
    testXml: string | null;
    statusCode: number;
};

export type AdzunaVariant = 'title-type-of-care' | 'with-salary';

export const bakecaItalianPlaceIdsByName: { [key: string]: number } = {
    'Agrigento': 122,
    'Alessandria': 84,
    'Ancona': 34,
    'Aosta': 44,
    'Arezzo': 112,
    'Ascoli Piceno': 166,
    'Asti': 98,
    'Avellino': 136,
    'Bari': 13,
    'Barletta': 130,
    'Belluno': 160,
    'Benevento': 148,
    'Bergamo': 16,
    'Biella': 108,
    'Bologna': 8,
    'Bolzano': 120,
    'Brescia': 20,
    'Brindisi': 126,
    'Cagliari': 10,
    'Caltanissetta': 162,
    'Campobasso': 154,
    'Carbonia': 190,
    'Caserta': 69,
    'Catania': 12,
    'Catanzaro': 132,
    'Chieti': 23,
    'Como': 30,
    'Cosenza': 32,
    'Cremona': 134,
    'Crotone': 174,
    'Cuneo': 42,
    'Enna': 170,
    'Fermo': 180,
    'Ferrara': 61,
    'Firenze': 6,
    'Foggia': 53,
    'Forlì': 75,
    'Frosinone': 118,
    'Genova': 9,
    'Gorizia': 188,
    'Grosseto': 158,
    'Imperia': 150,
    'Isernia': 192,
    'La Spezia': 57,
    'Latina': 46,
    'Lecce': 33,
    'Lecco': 138,
    'Livorno': 65,
    'Lodi': 88,
    'Lucca': 77,
    "L'Aquila": 144,
    'Macerata': 140,
    'Mantova': 71,
    'Matera': 164,
    'Provincia del Medio Campidano': 194,
    'Messina': 59,
    'Milano': 3,
    'Modena': 28,
    'Monza': 86,
    'Napoli': 7,
    'Novara': 67,
    'Nuoro': 182,
    'Olbia': 186,
    'Oristano': 178,
    'Padova': 14,
    'Palermo': 11,
    'Parma': 19,
    'Pavia': 17,
    'Perugia': 18,
    'Pescara': 110,
    'Piacenza': 55,
    'Pisa': 21,
    'Pistoia': 152,
    'Pordenone': 102,
    'Potenza': 128,
    'Prato': 106,
    'Reggio Emilia': 29,
    'Reggio Calabria': 116,
    'Ragusa': 142,
    'Ravenna': 80,
    'Rieti': 184,
    'Rimini': 45,
    'Roma': 2,
    'Rovigo': 82,
    'Salerno': 36,
    'Sassari': 96,
    'Savona': 90,
    'Siena': 43,
    'Siracusa': 94,
    'Sondrio': 172,
    'Taranto': 100,
    'Teramo': 198,
    'Terni': 156,
    'Torino': 1,
    'Trapani': 124,
    'Trento': 26,
    'Treviso': 24,
    'Trieste': 35,
    'Udine': 22,
    'Urbino': 25,
    'Varese': 31,
    'Venezia': 15,
    'Verbania': 114,
    'Vercelli': 92,
    'Verona': 27,
    'Vibo Valentia': 176,
    'Vicenza': 73,
    'Viterbo': 146,
    'Maastricht': 999,
};
export const bakecaItalianPlaceNames = Object.keys(bakecaItalianPlaceIdsByName);
