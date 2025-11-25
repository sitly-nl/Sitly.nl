import { Child } from '../../models/child.model';
import { Translator } from '../translations.service';

export interface ChildrenStats {
    boysCount: number;
    girlsCount: number;
    totalCount: number;
    maxAge: number;
    minAge: number;
}

export class MessagesEmailService {
    static createTranslatedChildrenLine(children: Child[], translator: Translator) {
        const childrenStats = this.getChildrenStats(children);
        return this.getTranslatedChildrenLine(childrenStats, translator);
    }

    private static getChildrenStats(children: Child[]) {
        const childrenObject = { boysCount: 0, girlsCount: 0, totalCount: 0, maxAge: 0, minAge: Number.MAX_SAFE_INTEGER };
        if (!children.length) {
            return childrenObject;
        }
        return children.reduce((acc, child) => {
            if (child.gender === 'm') {
                acc.boysCount++;
            } else if (child.gender === 'f') {
                acc.girlsCount++;
            }

            acc.minAge = Math.min(acc.minAge, child.age);
            acc.maxAge = Math.max(acc.maxAge, child.age);
            acc.totalCount++;

            return acc;
        }, childrenObject);
    }

    private static getTranslatedChildrenLine(childrenStats: ChildrenStats, translator: Translator) {
        if (childrenStats.totalCount === 0) {
            return '';
        }
        let childrenSubLine = '';
        if (childrenStats.boysCount && childrenStats.girlsCount) {
            const boysText =
                childrenStats.boysCount === 1
                    ? `${translator.translated('general.son')}`
                    : `${childrenStats.boysCount} ${translator.translated('general.sons')}`;

            const girlsText =
                childrenStats.girlsCount === 1
                    ? `${translator.translated('general.daughter')}`
                    : `${childrenStats.girlsCount} ${translator.translated('general.daughters')}`;

            childrenSubLine = `${boysText}, ${girlsText}`;
        } else if (childrenStats.boysCount && !childrenStats.girlsCount) {
            childrenSubLine =
                childrenStats.boysCount === 1
                    ? `${translator.translated('general.son')}`
                    : `${childrenStats.boysCount} ${translator.translated('general.sons')}`;
        } else {
            childrenSubLine =
                childrenStats.girlsCount === 1
                    ? `${translator.translated('general.daughter')}`
                    : `${childrenStats.girlsCount} ${translator.translated('general.daughters')}`;
        }

        return childrenStats.totalCount === 1
            ? `${translator.translated('general.children.1', {
                  child: childrenSubLine,
                  age: `${childrenStats.maxAge}`,
              })}`
            : `${translator.translated('general.children.more', {
                  children: childrenSubLine,
                  minAge: `${childrenStats.minAge}`,
                  maxAge: `${childrenStats.maxAge}`,
              })}`;
    }
}
