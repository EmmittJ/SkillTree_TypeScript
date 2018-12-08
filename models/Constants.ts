export class Constants implements IConstants {
    classes: { [id: string]: number; };
    classesToName: { [id: string]: string };
    characterAttributes: { [id: string]: number; };
    PSSCentreInnerRadius: number;
    skillsPerOrbit: number[];
    orbitRadii: number[];

    constructor(constants: IConstants) {
        this.classes = constants.classes;
        this.characterAttributes = constants.characterAttributes;
        this.PSSCentreInnerRadius = constants.PSSCentreInnerRadius;
        this.skillsPerOrbit = constants.skillsPerOrbit;
        this.orbitRadii = constants.orbitRadii;

        this.classesToName = {
            "StrClass": "marauder",
            "DexClass": "ranger",
            "IntClass": "witch",
            "StrDexClass": "duelist",
            "StrIntClass": "templar",
            "DexIntClass": "shadow",
            "StrDexIntClass": "scion"
        };
    }
}