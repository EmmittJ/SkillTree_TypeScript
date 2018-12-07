interface ISkillNode extends IRootNode {
    /** Id of the SkillNode */
    id: number;

    /** Name of the SkillNode */
    dn: string;

    /** Icon of the SkillNode (i.e. "Art/2DArt/SkillIcons/passives/Champion/AnEFortify.png") */
    icon: string;

    /** Determines if the SkillNode is a Keystone */
    ks: boolean;

    /** Determines if the SkillNode is a Notable */
    not: boolean;

    /** Determines if the SkillNode is a Mastery */
    m: boolean,

    /** Determines if the Skillnode is a Jewel Socket */
    isJewelSocket: boolean;

    /** Determines if the SkillNode is Multiple Choice */
    isMultipleChoice: boolean;

    /** Options of a Multiple Choice node */
    isMultipleChoiceOption: boolean;

    /** Determines the number of passive points received when this SkillNode is skilled */
    passivePointsGranted: number;

    /** The name of the Ascendancy Class the SkillNode belongs to */
    ascendancyName: string,

    /** Determines if the SkillNode is the root of an Ascendancy Class */
    isAscendancyStart: boolean,

    /** Detemines the root classes of the SkillNode */
    spc: Array<number>;

    /** The stat descriptions of the SkillNode */
    sd: Array<string>;

    /** Additional information on mechanics or the node itself (appears grey in game) */
    reminderText: Array<string>;
}

interface IRootNode {
    /** The group in of the SkillNode */
    g: number;

    /** The Orbit Radii of the SkillNode
     * @see Constants.orbitRadii
     */
    o: number;

    /** The index on the Orbit
     * @see Constants.skillsPerOrbit
     */
    oidx: number;

    /** The amount of Dex the SkillNode gives */
    da: number;

    /** The amount of Int the SkillNode gives */
    ia: number;

    /** The amount of Strength the SkillNode gives */
    sa: number;

    /** The conections from this SkillNode*/
    out: Array<number>;

    /** The connections to this SkillNode */
    in: Array<number>;
}