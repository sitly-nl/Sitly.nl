import { remove as removeDiacritics } from 'diacritics';
import { sampleSize, snakeCase, trim } from 'lodash';

export class StringUtil {
    static safeString(str: string) {
        const separationChar = '-';
        str = removeDiacritics(str);
        str = trim(str.replace(/[^a-zA-Z0-9]/g, separationChar).toLowerCase(), separationChar);
        return str;
    }

    static camelCase(string: string) {
        const text = string.replace(/[-_\s.]+(.)?/g, (_, c: string) => (c ? c.toUpperCase() : ''));
        return text.substring(0, 1).toLowerCase() + text.substring(1);
    }

    static snakeCase(text: string) {
        return snakeCase(text);
    }

    static capitalizeFirstLetter(string: string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    static randomString(stringSize: number, includeUpperCase?: boolean, includeNumbers = true) {
        const chars =
            'abcdefghijklmnopqrstuvwxyz' + (includeNumbers ? '0123456789' : '') + (includeUpperCase ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' : '');
        return sampleSize(chars.repeat(Math.ceil(stringSize / chars.length)), stringSize).join('');
    }
}
