interface ISkillNode extends IRootNode {
    /** Id of the SkillNode */
    skill: number;

    /** @deprecated Id of the SkillNode */
    id: number | undefined;

    /** @deprecated Name of the SkillNode */
    dn: string | undefined;

    /** Name of the SkillNode */
    name: string | undefined;

    /** Icon of the SkillNode (i.e. "Art/2DArt/SkillIcons/passives/Champion/AnEFortify.png") */
    icon: string;

    /** Inactive Icon of the SkillNode (i.e. "Art/2DArt/SkillIcons/passives/Champion/AnEFortify.png") */
    inactiveIcon: string | undefined;

    /** Active Icon of the SkillNode (i.e. "Art/2DArt/SkillIcons/passives/Champion/AnEFortify.png") */
    activeIcon: string | undefined;

    /** Active Icon Effect of the SkillNode (i.e. "Art/2DArt/SkillIcons/passives/Champion/AnEFortify.png") */
    activeEffectImage: string | undefined;

    /** Mastery Effects of the SkillNode */
    masteryEffects: IMasteryEffect[] | undefined;

    /** @deprecated Determines if the SkillNode is a Keystone */
    ks: boolean | undefined;

    /** Determines if the SkillNode is a Keystone */
    isKeystone: boolean | undefined;

    /** @deprecated Determines if the SkillNode is a Notable */
    not: boolean | undefined;

    /** Determines if the SkillNode is a Notable */
    isNotable: boolean | undefined;

    /** @deprecated Determines if the SkillNode is a Mastery */
    m: boolean | undefined;

    /** Determines if the SkillNode is a Mastery */
    isMastery: boolean | undefined;

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

    /** @deprecated Detemines the root classes of the SkillNode */
    spc: Array<number> | undefined;

    /** Detemines the root classes of the SkillNode */
    classStartIndex: number | undefined;

    /** @deprecated The stat descriptions of the SkillNode */
    sd: Array<string> | undefined;

    /** The stat descriptions of the SkillNode */
    stats: Array<string> | undefined;

    /** Node flavour text (similar to the flavour text on unqiues, appears in the unique border color in game) */
    flavourText: Array<string>;

    /** Additional information on mechanics or the node itself (appears grey in game) */
    reminderText: Array<string>;
}

interface IRootNode {
    /** @deprecated The group id of the SkillNode */
    g: number | undefined;

    /** The group id of the SkillNode */
    group: number | undefined;

    /** @deprecated
     *  The Orbit Radii of the SkillNode
     * @see Constants.orbitRadii
     */
    o: number | undefined;

    /** The Orbit Radii of the SkillNode
     * @see Constants.orbitRadii
     */
    orbit: number | undefined;

    /** @deprecated
     *  The index on the Orbit
     * @see Constants.skillsPerOrbit
     */
    oidx: number | undefined;

    /** The index on the Orbit
     * @see Constants.skillsPerOrbit
     */
    orbitIndex: number | undefined;

    /** @deprecated The amount of Dex the SkillNode gives */
    da: number | undefined;

    /** The amount of Dex the SkillNode gives */
    grantedDexterity: number | undefined;

    /** @deprecated The amount of Int the SkillNode gives */
    ia: number | undefined;

    /** The amount of Int the SkillNode gives */
    grantedIntelligence: number | undefined;

    /** @deprecated The amount of Strength the SkillNode gives */
    sa: number | undefined;

    /** The amount of Strength the SkillNode gives */
    grantedStrength: number | undefined;

    /** The conections from this SkillNode*/
    out: Array<number>;

    /** The connections to this SkillNode */
    in: Array<number>;
}