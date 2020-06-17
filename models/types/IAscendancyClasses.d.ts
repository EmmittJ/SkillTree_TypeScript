interface IAscendancyClasses {
    name: string;
    base_str: number | undefined;
    base_dex: number | undefined;
    base_int: number | undefined;
    classes: { [id: string]: IAscendancyClass } | undefined;
    ascendancies: { [id: string]: IAscendancyClass } | undefined;
}

interface IAscendancyClass {
    id: string | undefined;
    name: string;
    displayName: string | undefined;
    flavourText: string;
    flavourTextRect: string | { x: number, y: number, width: number, height: number } | undefined;
    flavourTextColour: string;
}