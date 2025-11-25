export abstract class ModelAttributes {
    protected abstract mappings: Record<string, string>;

    map(record: Record<string, unknown>) {
        const ret: Record<string, unknown> = {};
        for (const i of Object.keys(this.mappings)) {
            ret[i] = record[this.mappings[i]];
        }
        return ret;
    }

    getAttributeKeys() {
        return Object.keys(this.mappings);
    }
}
