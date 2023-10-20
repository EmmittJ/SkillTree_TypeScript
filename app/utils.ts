import { download } from "./download";

export class utils {
    public static poecdn = "http://web.poecdn.com/";
    public static DATA_URI = "data";
    public static SKILL_TREES_URI = `${utils.DATA_URI}/skill-trees`;

    public static getKeyByValue(dict: { [key: string]: any }, value: any): string | undefined {
        return Object.keys(dict).find((key: string) => { return dict[key] === value; });
    }

    public static NotUndefined<T>(x: T | undefined): x is T {
        return x !== undefined;
    }

    public static NotNullOrWhiteSpace(x: string | null | undefined): x is string | null | undefined {
        return x !== undefined && x !== null && x.trim() !== "";
    }

    public static Download(data: string | Uint8Array | Blob, filename?: string, mimeType?: string): XMLHttpRequest | boolean {
        return download(data, filename, mimeType);
    }
}