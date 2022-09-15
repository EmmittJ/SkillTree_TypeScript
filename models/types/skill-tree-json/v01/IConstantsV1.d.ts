interface IConstantsV1 {
    /** A map of classes by name to number (i.e. "StrClass": 1) */
    classes: { [id: string]: number };

    /** A map of attributes by name to number (i.e. "Strength": 0) */
    characterAttributes: { [id: string]: number };

    /** SkillNode radius from center */
    PSSCentreInnerRadius: number;

    /** The SkillNode.oidx property maps here */
    skillsPerOrbit: Array<number>;

    /** The SkillNode.o property maps here */
    orbitRadii: Array<number>;
}