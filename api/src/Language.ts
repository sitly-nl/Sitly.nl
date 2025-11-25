import { readFileSync } from 'fs';
import * as langs from 'langs';
import { Type } from 'langs';
import { invert } from 'lodash';

export interface LanguageFormat {
    code?: string;
    localName?: string;
    name?: string;
    dutchName?: string; // legacy database format
    isCommon?: boolean;
}

const globalLanguageNames: Record<string, Record<string, string>> = {};
const globalLanguageCodes: Record<string, Record<string, string>> = {};

export class Language {
    private static allLegacyLanguageCodes: Record<string, string>;

    private static getLanguageCodes(requestLanguage: string) {
        this.loadLanguage(requestLanguage);
        return globalLanguageCodes[requestLanguage];
    }

    private static getLanguageName(languageCode: string, requestLanguageCode?: string) {
        return requestLanguageCode ? this.loadLanguage(requestLanguageCode)[languageCode] : undefined;
    }

    static getLanguage(localLanguageName: string, requestLanguageCode: string): LanguageFormat {
        const lang = Language.byLocalName(localLanguageName);
        if (!lang) {
            const legacyLang = this.getLanguageLegacy(localLanguageName, requestLanguageCode);
            return legacyLang;
        }
        const languageName = requestLanguageCode === 'en' ? lang.name : this.getLanguageName(lang[1], requestLanguageCode);
        return {
            code: lang[1],
            name: languageName,
            localName: lang.local,
        };
    }

    static getLanguagesByLanguageCodes(languagesCodes: string[], requestLanguageCode?: string): LanguageFormat[] {
        const languages = languagesCodes.map(languageCode => Language.byCode(languageCode));
        const ret = languages
            .filter(item => item !== undefined)
            .map(lang => {
                const languageName = requestLanguageCode === 'en' ? lang.name : this.getLanguageName(lang[1], requestLanguageCode);
                return {
                    code: lang[1],
                    name: languageName,
                    localName: lang.local,
                };
            });
        return ret;
    }

    static getLanguageByLanguageCode(languageCode: string, requestLanguageCode = 'en'): LanguageFormat {
        const lang = Language.byCode(languageCode);
        const languageName = requestLanguageCode === 'en' ? lang?.name : this.getLanguageName(lang?.[1] ?? '', requestLanguageCode);
        return {
            code: lang?.[1],
            name: languageName,
            localName: lang?.local,
        };
    }

    static languageCodes() {
        return [...langs.codes('1'), 'smi'];
    }

    static byCode(code: string) {
        if (code === 'smi') {
            return { name: 'Sami', local: 'Samisk', 1: 'smi' };
        }
        return langs.where('1', code);
    }

    private static byLocalName(localName: string) {
        if (localName === 'Samisk') {
            return { name: 'Sami', local: 'Samisk', 1: 'smi' };
        }
        return langs.where(<Type>'local', localName);
    }

    static loadLanguage(requestLanguageCode: string) {
        try {
            if (globalLanguageNames[requestLanguageCode]) {
                return globalLanguageNames[requestLanguageCode];
            }
            const languagesJson = readFileSync(`resources/locale/languages/${requestLanguageCode}.json`).toString();
            const languageNames = JSON.parse(languagesJson).Names as Record<string, string>;
            globalLanguageNames[requestLanguageCode] = languageNames;
            globalLanguageCodes[requestLanguageCode] = invert(languageNames);
        } catch {
            throw new Error(`Language ${requestLanguageCode} is not added to resources/locale/languages`);
        }
        return globalLanguageNames[requestLanguageCode];
    }

    private static getLanguageLegacy(languageName: string, requestLanguageCode: string): LanguageFormat {
        if (!this.allLegacyLanguageCodes) {
            const languageCodesNl = this.getLanguageCodes('nl');
            const languageCodesEn = this.getLanguageCodes('en');
            this.allLegacyLanguageCodes = Object.assign(languageCodesNl, languageCodesEn);
        }
        const languageCode = this.allLegacyLanguageCodes[languageName];
        if (languageCode) {
            const lang = Language.byCode(languageCode);
            if (lang) {
                const languageName = requestLanguageCode === 'en' ? lang.name : this.getLanguageName(lang[1], requestLanguageCode);
                return {
                    code: languageCode,
                    name: languageName,
                    localName: lang.local,
                };
            } else {
                const ret = {
                    code: languageCode,
                    name: languageName,
                    localName: languageName,
                };
                return ret;
            }
        } else {
            return {
                code: undefined,
                name: languageName,
                localName: undefined,
            };
        }
    }
}
