export class Utils {
    public static poecdn = "http://web.poecdn.com/";
    public static getKeyByValue(dict: { [key: string]: any }, value: any): string | undefined {
        return Object.keys(dict).find((key: string) => { return dict[key] === value; });
    }

    public static urlExists(url: string): boolean {
        fetch(url).then((status) => {
            return status.ok;
        });

        return false;
    }
}