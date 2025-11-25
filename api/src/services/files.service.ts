import { readFileSync } from 'fs';
import { BrandCode } from '../models/brand-code';

export class Files {
    static environment = JSON.parse(readFileSync('./environment.json', 'utf8')) as unknown;
    static brands = JSON.parse(readFileSync('brands.json', 'utf8')) as Brand[];
    static config = JSON.parse(readFileSync('default-config.json', 'utf8')) as DefaultConfig;
    static commonLanguageCodes = JSON.parse(readFileSync('resources/locale/common-languages.json', 'utf8')) as string[];
}

interface Brand {
    name: string;
    id: BrandCode;
    country: string;
    url: string;
    active: boolean;
    description: string;
}

interface DefaultConfig {
    default_locale: string;
}
