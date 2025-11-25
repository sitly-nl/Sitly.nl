import { BrandCode } from './../models/brand-code';
import { SentryService } from './sentry.service';
import { getModels } from '../sequelize-connections';
import { CacheItem, CacheService } from './cache.service';
import { UserWarningLevel } from '../types';

export type AnalyzerReplacements = {
    replacements: string[];
    replaced: string;
};

const commaSeparatedPhraseThreshold = 0.6;

export class TextAnalyzerService {
    static readonly fakeAboutRegExp = '\\w{3,}\\b.*\\w{3,}'; // contain at least 2 words longer than 2 characters each
    static readonly emojiNumbers = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];

    static hasPhoneNumber(str: string, numberReplacements: string[]) {
        // remove default date format from telephone number matching
        const dateRegex = /[0-9]{2}-[0-9]{2}-(19[0-9]{2}|20[0-9]{2})/g;
        str = str.replace(dateRegex, '');

        const timeRegex = /[0-9]{2}[.:][0-9]{2} ?- ?[0-9]{2}[.:][0-9]{2}/g;
        str = str.replace(timeRegex, '');

        const yearRegex = /20[0-9]{2} ?- ?20[0-9]{2}/g;
        str = str.replace(yearRegex, '');

        // remove separation characters from string
        str = str.replace(/[_\-.,?!¿¡(): [\]]/g, '');

        const whatsAppMatches = /wh?atsapp?/i.exec(str);
        if (whatsAppMatches) {
            return true;
        }

        const writtenNumbersRegex = new RegExp([...numberReplacements, ...TextAnalyzerService.emojiNumbers].join('|'), 'g');
        str = str.replace(writtenNumbersRegex, match => {
            if (numberReplacements.includes(match)) {
                return numberReplacements.indexOf(match).toString();
            } else {
                return TextAnalyzerService.emojiNumbers.indexOf(match).toString();
            }
        });

        const numberMatches = /[0-9]{8}/.exec(str);
        return !!numberMatches;
    }

    static hasEmailAddress(str: string) {
        str = str.replace(/ /g, '').replace(/\.[^a-zA-Z]/g, '');

        const dotStrings = ['\\.', 'dot', 'punkt', 'punt', 'point', 'punto', 'ponto'];

        const dotPattern = `([^a-zA-Z]+)?(${dotStrings.join('|')})([^a-zA-Z]+)?`;

        const emailDomains = ['hotmail', 'gmail', 'yahoo', 'live\\.[a-z]+', 'outlook'];

        let emailPattern =
            "(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:" +
            dotPattern +
            '[a-z0-9!#$%&\'*+/=?^_`{|}~-]+)*|" \
                            (?:[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x21\\x23-\\x5b\\x5d-\\x7f]|\\\\[\\x01-\\x09\\x0b\\x0c\\x0e-\\x7f])*") \
                            (@|[^a-z]+at[^a-z]+)(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?' +
            dotPattern +
            ')+[a-z0-9] \
                            (?:[a-z0-9-]*[a-z0-9])?|\\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)' +
            dotPattern +
            ') \
                            {3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]: \
                            (?:[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x21-\\x5a\\x53-\\x7f]|\\\\[\\x01-\\x09\\x0b\\x0c\\x0e-\\x7f])+)\\])';

        emailPattern = emailPattern.replace(/\s/g, '');

        const emailRegex = new RegExp(emailPattern);
        const domainPattern = `(${emailDomains.join('|')})`;
        const domainRegex = new RegExp(domainPattern);

        const atMatches = str.indexOf('@') > -1; // don't check for emails if the string doesn't contain an @
        const emailMatches = atMatches && !!str.match(emailRegex);
        const domainMatches = !!str.match(domainRegex);
        return emailMatches || domainMatches;
    }

    static hasWebsite(str: string) {
        const websiteHints = ['http', 'www', '\\.com'];
        return !!str.match(new RegExp(`(${websiteHints.join('|')})`));
    }

    static hasSocialMedia(str: string) {
        const socialMedia = ['linkedin', 'twitter', 'instagram', 'facebook'];

        return !!str.match(new RegExp(`(${socialMedia.join('|')})`));
    }

    static hasPersonalData(str: string, numberReplacements: string[]) {
        if (!str) {
            return false;
        }
        const hasPhoneNumber = this.hasPhoneNumber(str, numberReplacements);
        const hasEmailAddress = this.hasEmailAddress(str);
        const hasSocialMedia = this.hasSocialMedia(str);
        const hasWebsite = this.hasWebsite(str);

        return hasPhoneNumber || hasEmailAddress || hasSocialMedia || hasWebsite;
    }

    static isFakeAbout(str?: string) {
        if (!str) {
            return true;
        }
        return !str.match(new RegExp(TextAnalyzerService.fakeAboutRegExp));
    }

    static replacePersonalData(str: string, numberReplacements: string[]): AnalyzerReplacements {
        str = str.trim();
        str = TextAnalyzerService.emojiNumbers.reduce((str, current, i) => {
            const reg = new RegExp(current, 'g');
            return str.replace(reg, i.toString());
        }, str);

        const websitePattern = /((https?:\/\/)|((https?:\/\/)?www.))[-a-z0-9]{2,256}\.[a-z]{2,6}\b([-a-z0-9]*)/gi;

        let replacements = [];

        const websiteMatches = str.match(websitePattern);

        if (websiteMatches) {
            replacements.push(...websiteMatches);
        }

        const writtenNumberPattern = [...numberReplacements, ...TextAnalyzerService.emojiNumbers].join('|');

        const telephoneRegex = new RegExp('(([0-9]|' + writtenNumberPattern + ')([_\\-.,?!¿¡():s\\[\\] ])?){8,}', 'g');
        const telephoneMatches = str.match(telephoneRegex);
        if (telephoneMatches) {
            replacements.push(...telephoneMatches);
        }

        const emailMatches = str.match(/\b([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
        if (emailMatches) {
            replacements.push(...emailMatches);
        }
        const networks = ['linkedin', 'twitter', 'instagram', 'facebook', 'wh?atsapp?'];

        const networkMatches = str.match(new RegExp(networks.join('|'), 'gi'));
        if (networkMatches) {
            replacements.push(...networkMatches);
        }

        replacements = replacements.map(str => str.trim());

        const replaced = replacements.reduce((str, current) => {
            return str.replace(current, '*'.repeat(current.length));
        }, str);

        return {
            replacements,
            replaced,
        };
    }

    static async sensitivePhrasesIn(textToCheck: string, brandCode: BrandCode) {
        if (!textToCheck) {
            return [];
        }

        const models = getModels(brandCode);

        let sensitivePhrases;
        {
            const cache = await CacheService.getInstance(
                CacheItem.sensitivePhrase({
                    database: models.SensitivePhrase.sequelize.config.database,
                    key: 'all',
                }),
            );
            const cached = await cache.get<{ type: UserWarningLevel; phrase: string }[]>();
            if (cached) {
                sensitivePhrases = cached;
            } else {
                const items = await models.SensitivePhrase.all();
                sensitivePhrases = items.map(item => {
                    return { phrase: item.phrase, type: item.type };
                });
                cache.set(sensitivePhrases);
            }
        }

        let excludedPhrases;
        {
            const cache = await CacheService.getInstance(
                CacheItem.sensitivePhraseExclusion({
                    database: models.SensitivePhraseExclusion.sequelize.config.database,
                    key: 'all',
                }),
            );
            const cached = await cache.get<string[]>();
            if (cached) {
                excludedPhrases = cached;
            } else {
                const items = await models.SensitivePhraseExclusion.all();
                excludedPhrases = items.map(item => item.phrase);
                cache.set(excludedPhrases);
            }
        }

        const matches = [];
        const specialCharsRegex = '[_\\-,?!¿¡():+@.]';
        const lowerTextToVerify = textToCheck.toLowerCase();

        const lowerTextNoExclusions = excludedPhrases.reduce((text, excludedPhrase) => {
            try {
                return text.replace(new RegExp(excludedPhrase.toLowerCase(), 'g'), '');
            } catch (error) {
                console.log(error);
                SentryService.captureException(error, 'text-analyzer.sensitivePhrasesIn.exclusions', brandCode);
                return text;
            }
        }, lowerTextToVerify);

        for (const phrase of sensitivePhrases) {
            const sensitivePhraseText = phrase.phrase;

            // Support comma-separated phrases
            const phraseInternalArray = sensitivePhraseText.split(',');
            const internalMatches: string[] = [];

            for (const phraseInternalString of phraseInternalArray) {
                try {
                    const lowerStringPhrase = phraseInternalString.toLowerCase();

                    // Test against phrases that contain a special char like "fuck-you" / "fuck you"
                    if (
                        lowerStringPhrase.match(new RegExp(specialCharsRegex.replace(']', ' ]'), 'g')) &&
                        lowerTextNoExclusions.includes(lowerStringPhrase)
                    ) {
                        internalMatches.push(lowerStringPhrase);
                        continue;
                    }

                    // Test after special chars in text are replaced with space ' ' -> go.fuck.yourself => go fuck yourself
                    const specialCharsReplacedBySpace = lowerTextNoExclusions.replace(new RegExp(specialCharsRegex, 'g'), ' ');
                    if (TextAnalyzerService.matchPhrase(lowerStringPhrase, specialCharsReplacedBySpace)) {
                        internalMatches.push(lowerStringPhrase);
                        continue;
                    }

                    // Test when special chars in text are replaced with empty string '' -> f.u.c.k you => fuck you
                    const specialCharsReplacedByEmptyString = lowerTextNoExclusions.replace(new RegExp(specialCharsRegex, 'g'), '');
                    if (TextAnalyzerService.matchPhrase(lowerStringPhrase, specialCharsReplacedByEmptyString)) {
                        internalMatches.push(lowerStringPhrase);
                        continue;
                    }

                    // Test after removal of spaces from space seperated word -> hello f u c k you => hello fuck you
                    const matchSpaceSeperatedWord = specialCharsReplacedBySpace.match(new RegExp(/(\s+[a-zA-Z]?){2,}\s+/, 'g'));
                    if (matchSpaceSeperatedWord?.[0]) {
                        const noSpaceSeperatedWord = matchSpaceSeperatedWord[0].replace(/\s/g, '');
                        if (TextAnalyzerService.matchPhrase(lowerStringPhrase, noSpaceSeperatedWord)) {
                            internalMatches.push(lowerStringPhrase);
                            continue;
                        }
                    }
                } catch (error) {
                    console.log(error);
                    SentryService.captureException(error, 'text-analyzer.sensitivePhrasesIn.phraseInternalString', brandCode);
                }
            }

            if (internalMatches.length >= phraseInternalArray.length * commaSeparatedPhraseThreshold) {
                matches.push(phrase);
            }
        }

        return matches;
    }

    private static matchPhrase(phrase: string, text: string) {
        const escapedPhrase = phrase.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        return (
            text.match(new RegExp('^' + escapedPhrase, 'g')) ||
            text.match(new RegExp(escapedPhrase + '$', 'g')) ||
            text.match(new RegExp(' ' + escapedPhrase + ' ', 'g'))
        );
    }
}
