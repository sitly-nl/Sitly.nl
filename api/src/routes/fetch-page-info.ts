export class FetchPageInfo {
    offset = (this.number - 1) * this.size;
    limit = this.size;

    constructor(
        public size: number,
        public number: number,
    ) {}

    static instance(page: Record<string, string> | undefined) {
        const size = parseInt(page?.size ?? '', 10);
        const number = parseInt(page?.number ?? '', 10);
        return Number.isNaN(size) || Number.isNaN(number) ? undefined : new FetchPageInfo(size, number);
    }

    responseMeta(totalCount: number) {
        return {
            totalCount,
            totalPages: Math.ceil(totalCount / this.size),
        };
    }

    paginationInfo(total: number) {
        return {
            page: this.number,
            pageCount: total ? Math.ceil(total / this.size) : 0,
            pageSize: this.size,
            rowCount: total,
        };
    }
}
