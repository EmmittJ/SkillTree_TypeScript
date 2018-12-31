interface IAscendancyClasses {
    name: string;
    classes: { [id: string]: IAscendancyClass };
}

interface IAscendancyClass {
    name: string;
    displayName: string;
    flavourText: string;
    flavourTextRect: string;
    flavourTextColour: string;
}