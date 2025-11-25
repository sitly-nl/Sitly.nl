export class Util {
    static keysOf<T extends object>(obj: T) {
        return Object.keys(obj) as (keyof T)[];
    }

    static entries<T extends object>(obj: T) {
        return Object.entries(obj) as [keyof T, never][];
    }
}
