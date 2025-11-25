export class SearchParseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SearchParseError';

        Object.setPrototypeOf(this, SearchParseError.prototype);
    }
}
