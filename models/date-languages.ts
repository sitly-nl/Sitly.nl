import en from 'date-fns/locale/en-GB';
import nl from 'date-fns/locale/nl';
import it from 'date-fns/locale/it';
import nb from 'date-fns/locale/nb';
import es from 'date-fns/locale/es';
import fi from 'date-fns/locale/fi';
import da from 'date-fns/locale/da';
import de from 'date-fns/locale/de';
import fr from 'date-fns/locale/fr';
import pt from 'date-fns/locale/pt';
import ms from 'date-fns/locale/ms';
import { format } from 'date-fns';

export const dateLanguages: Record<string, Locale> = { en, nl, it, nb, es, fi, da, de, fr, pt, ms };
const getDateLanguage = (localeCode: string) => {
    const defaultLanguage = dateLanguages.en;

    if (!localeCode) {
        return defaultLanguage;
    }

    const language = localeCode.substring(0, 2);
    return dateLanguages[language] || defaultLanguage;
};
export const formattedDate = (dateValue: Date | string | number, formatString: string, localeCode: string) => {
    return format(dateValue instanceof Date ? dateValue : new Date(dateValue), formatString, { locale: getDateLanguage(localeCode) });
};
