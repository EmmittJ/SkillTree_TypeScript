export class utils {
    public static poecdn = "http://web.poecdn.com/";

    public static getKeyByValue(dict: { [key: string]: any }, value: any): string | undefined {
        return Object.keys(dict).find((key: string) => { return dict[key] === value; });
    }

    public static NotUndefined<T>(x: T | undefined): x is T {
        return x !== undefined;
    }
}