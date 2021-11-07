export class Constants implements IConstants {
    classes: { [id: string]: number; };
    characterAttributes: { [id: string]: number; };
    PSSCentreInnerRadius: number;
    skillsPerOrbit: number[];
    orbitRadii: number[];

    classesToName: { [id: string]: string };
    classIdToName: { [id: number]: string };

    constructor(constants: IConstants) {
        this.classes = constants.classes;
        this.characterAttributes = constants.characterAttributes;
        this.PSSCentreInnerRadius = constants.PSSCentreInnerRadius;
        this.skillsPerOrbit = constants.skillsPerOrbit;
        this.orbitRadii = constants.orbitRadii;

        this.classesToName = {
            "StrClass": "Marauder",
            "DexClass": "Ranger",
            "IntClass": "Witch",
            "StrDexClass": "Duelist",
            "StrIntClass": "Templar",
            "DexIntClass": "Shadow",
            "StrDexIntClass": "Scion"
        };

        this.classIdToName = {
            0: "Scion",
            1: "Marauder",
            2: "Ranger",
            3: "Witch",
            4: "Duelist",
            5: "Templar",
            6: "Shadow"
        };
    }
}